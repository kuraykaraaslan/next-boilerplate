'use client';

import { useState } from 'react';
import { toast } from 'react-toastify';
import axiosInstance from '@/libs/axios';
import { UserPreferences, UserPreferencesDefault } from '../user_preferences.types';


export default function UserPreferencesNotificationsTab() {
  const [preferences, setPrefs] = useState<UserPreferences>(
   UserPreferencesDefault
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (saving) return;

    setSaving(true);

    await axiosInstance.put('/api/auth/me/preferences', {
      preferences,
    }).then((res) => {
      setPrefs(res.data.preferences);
      toast.success("Tercihler başarıyla güncellendi");
    }).catch((err) => {
      toast.error("Tercihler güncellenirken hata oluştu");
      console.error(err);
    }).finally(() => {
      setSaving(false);
    });
  };

  return (
    <div className="bg-base-100 border border-base-300 rounded-xl shadow-sm p-6 space-y-6">
      <div>
        <h2 className="text-lg font-bold">Bildirim Tercihleri</h2>
        <p className="text-sm text-base-content/70">
          Bildirim ve uygulama ayarlarını yönet.
        </p>
      </div>

      <div className="form-control">
        <label className="cursor-pointer label">
          <span className="label-text font-semibold">E-posta Bildirimleri</span>
          <input
            type="checkbox"
            className="toggle toggle-primary"
            checked={preferences.emailNotifications}
            onChange={e =>
              setPrefs(p => ({ ...p, emailNotifications: e.target.checked }))
            }
          />
        </label>
      </div>

      <div className="form-control">
        <label className="cursor-pointer label">
          <span className="label-text font-semibold">SMS Bildirimleri</span>
          <input
            type="checkbox"
            className="toggle toggle-primary"
            checked={preferences.smsNotifications}
            onChange={e =>
              setPrefs(p => ({ ...p, smsNotifications: e.target.checked }))
            }
          />
        </label>
      </div>

      <div className="form-control">
        <label className="cursor-pointer label">
          <span className="label-text font-semibold">Push Bildirimleri</span>
          <input
            type="checkbox"
            className="toggle toggle-primary"
            checked={preferences.pushNotifications}
            onChange={e =>
              setPrefs(p => ({ ...p, pushNotifications: e.target.checked }))
            }
          />
        </label>
      </div>

      <div className="form-control">
        <label className="cursor-pointer label">
          <span className="label-text font-semibold">Bülten Aboneliği</span>
          <input
            type="checkbox"
            className="toggle toggle-primary"
            checked={preferences.newsletter}
            onChange={e =>
              setPrefs(p => ({ ...p, newsletter: e.target.checked }))
            }
          />
        </label>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="btn btn-primary w-full"
      >
        {saving ? 'Kaydediliyor...' : 'Kaydet'}
      </button>
    </div>
  );
}
