'use client';

import { useState } from 'react';
import { toast } from 'react-toastify';
import axiosInstance from '@/libs/axios';
import ImageLoad from '@/modules/ui/forms/ImageLoad';
import { UserProfile, UserProfileDefault } from '../user_profile.types';
import SocialLinksInput from './partials/social-links-input';



export default function UserProfileEditTab() {
  const [userProfile, setUserProfile] = useState<UserProfile>(UserProfileDefault);

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);

    await axiosInstance.put('/api/auth/me/profile', {
      userProfile,
    }).then((res) => {
      setUserProfile(res.data.userProfile);

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
        <h2 className="text-lg font-bold">Profil Bilgileri</h2>
        <p className="text-sm text-base-content/70">
          Buradan profil bilgilerini güncelleyebilirsin.
        </p>
      </div>

      <div className="form-control w-full">
        <label className="label">
          <span className="label-text font-semibold">Ad</span>
        </label>
        <input
          type="text"
          value={userProfile.name || ''}
          onChange={e => setUserProfile({ ...userProfile, name: e.target.value })}
          placeholder="Tam adınızı girin"
          className="input input-bordered w-full"
          required
        />
      </div>

      <div className="form-control w-full">
        <label className="label">
          <span className="label-text font-semibold">Biyografi</span>
        </label>
        <textarea
          value={userProfile.biography || ''}
          onChange={e => setUserProfile({ ...userProfile, biography: e.target.value })}
          placeholder="Kendiniz hakkında kısa bir bilgi yazın"
          className="textarea textarea-bordered w-full"
          rows={4}
        />
      </div>

      <SocialLinksInput
        value={userProfile.socialLinks || []}
        onChange={(newLinks) => setUserProfile({ ...userProfile, socialLinks: newLinks })}
      />

      <div className="form-control w-full">
        <label className="label">
          <span className="label-text font-semibold">Profil Fotoğrafı</span>
        </label>
        <ImageLoad
          setImage={(imgUrl: string) => setUserProfile({ ...userProfile, profilePicture: imgUrl })}
          image={userProfile.profilePicture || ''}
          uploadFolder="users"
          toast={toast}
        />
      </div>

      <div className="form-control w-full">
        <label className="label">
          <span className="label-text font-semibold">Başlık Resmi</span>
        </label>
        <ImageLoad
          setImage={(imgUrl: string) => setUserProfile({ ...userProfile, headerImage: imgUrl })}
          image={userProfile.headerImage || ''}
          uploadFolder="users"
          toast={toast}
        />
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="btn btn-primary w-full"
      >
        {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
      </button>
    </div>
  );
}
