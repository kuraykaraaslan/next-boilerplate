"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useAuthStore } from "@/modules/auth/auth.store";
import { toast } from 'react-toastify';
import axiosInstance from "@/libs/axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGlobe,
  faPlus,
  faTrash,
  faCircleCheck,
  faClock,
  faExternalLinkAlt,
  faInfoCircle,
  faTriangleExclamation,
  faShieldHalved,
  faCopy
} from "@fortawesome/free-solid-svg-icons";

import { SafeTenantDomain, DomainVerificationInfo } from "@/modules/tenant_domain/tenant_domain.types";
import { DomainStatus } from "@/modules/tenant_domain/tenant_domain.enums";
import { TenantSettingsTabProps } from "@/modules/tenant_setting/tenant_setting.types";

const DomainsTab = ({ settings }: Partial<TenantSettingsTabProps>) => {
  const { tenantId } = useParams() as { tenantId: string };

  // Handle tenant base for proxied domains
  const isProxied = typeof window !== 'undefined' && !window.location.pathname.startsWith('/tenant/');
  const tenantBase = isProxied ? '' : `/tenant/${tenantId}`;

  const [domains, setDomains] = useState<SafeTenantDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<DomainVerificationInfo | null>(null);

  const fetchDomains = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(`${tenantBase}/api/domains`);
      if (response.data.success) {
        setDomains(response.data.domains || []);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to fetch domains");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDomains();
  }, [tenantId]);

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain) return;

    try {
      setIsAdding(true);
      const response = await axiosInstance.post(`${tenantBase}/api/domains`, {
        domain: newDomain
      });

      if (response.data.success) {
        toast.success("Domain added successfully");
        setNewDomain("");
        fetchDomains();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to add domain");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteDomain = async (id: string, domainName: string) => {
    if (!confirm(`Are you sure you want to remove ${domainName}?`)) return;

    try {
      const response = await axiosInstance.delete(`${tenantBase}/api/domains/${id}`);
      if (response.data.success) {
        toast.success("Domain removed");
        fetchDomains();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to remove domain");
    }
  };

  const handleVerify = async (id: string) => {
    try {
      setVerifyingId(id);
      const response = await axiosInstance.post(`${tenantBase}/api/domains/${id}/verify`);
      if (response.data.success && response.data.isVerified) {
        toast.success("Domain verified!");
        fetchDomains();
        setSelectedDomain(null);
        (document.getElementById('verification_modal') as any)?.close();
      } else {
        toast.error(response.data.message || "Verification failed");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Verification failed");
    } finally {
      setVerifyingId(null);
    }
  };

  const showVerificationInfo = async (domain: SafeTenantDomain) => {
    try {
      const response = await axiosInstance.get(`${tenantBase}/api/domains/${domain.tenantDomainId}`);
      if (response.data.success) {
        setSelectedDomain(response.data);
        (document.getElementById('verification_modal') as any)?.showModal();
      }
    } catch (error: any) {
      toast.error("Failed to load verification info");
    }
  };

  const limits = useMemo(() => {
    const domainList = Array.isArray(domains) ? domains : [];
    
    // In a real app, you'd check against NEXT_PUBLIC_WILDCARD_DOMAIN
    // For now, we use a heuristic or just count them all as custom if not sure
    // But let's try to be consistent with the backend logic if we can
    const customCount = domainList.filter(d => d.domain.split('.').length <= 2).length;
    const subdomainCount = domainList.filter(d => d.domain.split('.').length > 2).length;
    
    const maxDomains = parseInt(settings?.maxDomains || '3');
    const maxSubdomains = parseInt(settings?.maxSubdomains || '1');

    return {
      custom: { current: customCount, max: maxDomains, reached: customCount >= maxDomains },
      subdomain: { current: subdomainCount, max: maxSubdomains, reached: subdomainCount >= maxSubdomains }
    };
  }, [domains, settings]);

  const isNewDomainSubdomain = newDomain.split('.').length > 2;
  const canAdd = newDomain && (isNewDomainSubdomain ? !limits.subdomain.reached : !limits.custom.reached);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold">Custom Domains</h3>
          <p className="text-sm text-base-content/70">Manage domains and subdomains for your organization.</p>
        </div>
      </div>

      {/* Add Domain Form */}
      <div className="card bg-base-200 shadow-sm">
        <div className="card-body p-4">
          <form onSubmit={handleAddDomain} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-base-content/50">
                <FontAwesomeIcon icon={faGlobe} />
              </div>
              <input
                type="text"
                placeholder="example.com or app.example.com"
                className="input input-bordered w-full pl-10"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value.toLowerCase().trim())}
                disabled={isAdding}
              />
            </div>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={isAdding || !canAdd}
            >
              {isAdding ? <span className="loading loading-spinner"></span> : <FontAwesomeIcon icon={faPlus} className="mr-2" />}
              Add Domain
            </button>
          </form>
          <div className="mt-2 flex items-center gap-4 text-xs text-base-content/60">
            <span className={`flex items-center gap-1 ${limits.custom.reached ? 'text-error font-bold' : ''}`}>
              <FontAwesomeIcon icon={faShieldHalved} className="text-[10px]" /> 
              Limit: {limits.custom.current}/{limits.custom.max} Custom Domains
            </span>
            <span className={`flex items-center gap-1 ${limits.subdomain.reached ? 'text-error font-bold' : ''}`}>
              <FontAwesomeIcon icon={faShieldHalved} className="text-[10px]" /> 
              Limit: {limits.subdomain.current}/{limits.subdomain.max} Subdomains
            </span>
          </div>
        </div>
      </div>

      {/* Domains List */}
      <div className="overflow-x-auto bg-base-100 rounded-xl border border-base-300">
        <table className="table w-full">
          <thead>
            <tr>
              <th>Domain</th>
              <th>Status</th>
              <th>Type</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="text-center py-8">
                  <span className="loading loading-dots loading-lg"></span>
                </td>
              </tr>
            ) : !Array.isArray(domains) || domains.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-8 text-base-content/50 italic">
                  No domains added yet.
                </td>
              </tr>
            ) : (
              domains.map((domain) => (
                <tr key={domain.tenantDomainId} className="hover">
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{domain.domain}</span>
                      {domain.isPrimary && (
                        <span className="badge badge-primary badge-sm">Primary</span>
                      )}
                    </div>
                  </td>
                  <td>
                    {domain.domainStatus === "VERIFIED" || domain.domainStatus === "ACTIVE" ? (
                      <div className="flex items-center gap-1 text-success font-medium">
                        <FontAwesomeIcon icon={faCircleCheck} /> {domain.domainStatus}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-warning font-medium">
                        <FontAwesomeIcon icon={faClock} /> {domain.domainStatus}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className="badge badge-ghost badge-sm">
                      {domain.domain.split('.').length > 2 ? 'SUBDOMAIN' : 'CUSTOM'}
                    </span>
                  </td>
                  <td className="text-right space-x-2">
                    {domain.domainStatus !== "VERIFIED" && domain.domainStatus !== "ACTIVE" && (
                      <button 
                        className="btn btn-ghost btn-sm text-primary"
                        onClick={() => showVerificationInfo(domain)}
                      >
                        <FontAwesomeIcon icon={faInfoCircle} className="mr-1" /> Verify
                      </button>
                    )}
                    <button 
                      className="btn btn-ghost btn-sm text-error"
                      onClick={() => handleDeleteDomain(domain.tenantDomainId, domain.domain)}
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Verification Modal */}
      <dialog id="verification_modal" className="modal">
        <div className="modal-box max-w-2xl">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <FontAwesomeIcon icon={faShieldHalved} className="text-primary" /> Verify your domain
          </h3>
          <p className="py-4 text-sm opacity-80">
            To point your domain to our servers, please add the following DNS records to your domain provider.
          </p>

          <div className="space-y-4">
            <div className="p-4 bg-base-200 rounded-lg space-y-2 border border-base-300">
                <div className="flex justify-between items-center">
                  <span className="badge badge-accent font-mono">{selectedDomain?.method}</span>
                  <span className="text-xs opacity-60 italic">
                    {selectedDomain?.method === 'TXT' ? 'Add this TXT record to your DNS' : 'Point this CNAME to our servers'}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold opacity-50">Host / Record Name</label>
                    <div className="flex bg-base-300 p-2 rounded text-sm font-mono items-center justify-between">
                      <span className="truncate">{selectedDomain?.recordName}</span>
                      <button 
                        className="btn btn-xs btn-ghost"
                        onClick={() => {
                          if(selectedDomain) navigator.clipboard.writeText(selectedDomain.recordName);
                          toast.success("Copied!");
                        }}
                      >
                         <FontAwesomeIcon icon={faCopy} />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold opacity-50">Value / Target</label>
                    <div className="flex bg-base-300 p-2 rounded text-sm font-mono items-center justify-between">
                      <span className="truncate">{selectedDomain?.recordValue}</span>
                      <button 
                         className="btn btn-xs btn-ghost"
                         onClick={() => {
                           if(selectedDomain) navigator.clipboard.writeText(selectedDomain.recordValue);
                           toast.success("Copied!");
                         }}
                      >
                         <FontAwesomeIcon icon={faCopy} />
                      </button>
                    </div>
                  </div>
                </div>
            </div>

            <div className="alert alert-info shadow-none bg-info/10 text-info border-info/20 text-xs">
              <FontAwesomeIcon icon={faInfoCircle} />
              <span>DNS changes can take up to 48 hours to propagate, but usually happen within minutes.</span>
            </div>
            
            <div className="alert alert-warning shadow-none bg-warning/10 text-warning border-warning/20 text-xs">
              <FontAwesomeIcon icon={faTriangleExclamation} />
              <span>Make sure to remove any existing A or CNAME records for the same host.</span>
            </div>
          </div>

          <div className="modal-action flex items-center justify-between">
            <div className="text-xs opacity-50">
              Domain: <span className="font-mono">{selectedDomain?.domain}</span>
            </div>
            <div className="space-x-2">
              <form method="dialog" className="inline">
                <button className="btn btn-ghost">Close</button>
              </form>
              <button 
                className="btn btn-primary"
                onClick={() => handleVerify(domains?.find(d => d.domain === selectedDomain?.domain)?.tenantDomainId || '')}
                disabled={verifyingId !== null}
              >
                {verifyingId ? <span className="loading loading-spinner"></span> : <FontAwesomeIcon icon={faCircleCheck} className="mr-2" />}
                Verify Now
              </button>
            </div>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </div>
  );
};

export default DomainsTab;
