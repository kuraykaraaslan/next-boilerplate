'use client';

import { useState } from 'react';
import { toast } from 'react-toastify';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import axiosInstance from '@/libs/axios';
import { SafeUser } from '../user.types';


export default function UserBasicTab() {
  const [ user, setUser ] = useState<SafeUser | null>(null);

  const [phone, setPhone] = useState(user?.phone || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await axiosInstance.put('/api/auth/me/basic', {
        phone,
      });

      setUser(res.data.user);
      toast.success("Profil başarıyla güncellendi");
    } catch (err) {
      toast.error("Profil güncellenirken hata oluştu");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-base-100 border border-base-300 rounded-xl shadow-sm p-6 space-y-6">
      <div>
        <h2 className="text-lg font-bold">Profil Bilgileri</h2>
        <p className="text-sm text-base-content/70">
          Buradan profil bilgilerini güncelleyebilirsin.
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleSave}>
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text font-semibold">Telefon</span>
          </label>

          <PhoneInput
            defaultCountry="TR"
            value={phone}
            onChange={(v) => setPhone(v || '')}
            className="input input-bordered w-full"
            placeholder="+90 5XX XXX XX XX"
          />

          {phone && !isValidPhoneNumber(phone) && (
            <p className="text-error text-sm mt-1">Geçersiz telefon numarası</p>
          )}
        </div>

        <div className="form-control w-full">
          <label className="label">
            <span className="label-text font-semibold">E-mail Adresi</span>
          </label>

          <input
            type="email"
            value={user?.email || ''}
            disabled
            className="input input-bordered w-full bg-base-200 opacity-70"
          />

          <label className="label">
            <span className="label-text-alt">E-mail adresi değiştirilemez</span>
          </label>
        </div>

        <button disabled={loading} className="btn btn-primary w-full">
          {loading ? "Kaydediliyor..." : "Profili Kaydet"}
        </button>
      </form>
    </div>
  );
}
