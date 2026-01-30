import { useState, useEffect } from 'react';
import Breadcrumb from '../components/Breadcrumbs/Breadcrumb';

interface AudioProfile {
  id: string;
  name: string;
  sensitivity: number;
  ledBrightness: number;
  createdAt: number;
}

const Profile = () => {
  const [profiles, setProfiles] = useState<AudioProfile[]>(() => {
    const saved = localStorage.getItem('audio-profiles');
    return saved ? JSON.parse(saved) : [
      { id: '1', name: 'Default', sensitivity: 50, ledBrightness: 128, createdAt: Date.now() }
    ];
  });

  const [activeProfileId, setActiveProfileId] = useState<string>(() => {
    return localStorage.getItem('active-profile-id') || '1';
  });

  const [editingProfile, setEditingProfile] = useState<AudioProfile | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formSensitivity, setFormSensitivity] = useState(50);
  const [formLedBrightness, setFormLedBrightness] = useState(128);

  useEffect(() => {
    localStorage.setItem('audio-profiles', JSON.stringify(profiles));
  }, [profiles]);

  useEffect(() => {
    localStorage.setItem('active-profile-id', activeProfileId);
  }, [activeProfileId]);

  const handleCreateProfile = () => {
    if (!formName.trim()) {
      alert('Please enter a profile name');
      return;
    }

    const newProfile: AudioProfile = {
      id: Date.now().toString(),
      name: formName.trim(),
      sensitivity: formSensitivity,
      ledBrightness: formLedBrightness,
      createdAt: Date.now(),
    };

    setProfiles([...profiles, newProfile]);
    setFormName('');
    setFormSensitivity(50);
    setFormLedBrightness(128);
    setShowCreateForm(false);
  };

  const handleUpdateProfile = () => {
    if (!editingProfile || !formName.trim()) {
      alert('Please enter a profile name');
      return;
    }

    setProfiles(profiles.map(p => 
      p.id === editingProfile.id 
        ? { ...p, name: formName.trim(), sensitivity: formSensitivity, ledBrightness: formLedBrightness }
        : p
    ));
    setEditingProfile(null);
    setFormName('');
    setFormSensitivity(50);
    setFormLedBrightness(128);
  };

  const handleDeleteProfile = (id: string) => {
    if (profiles.length === 1) {
      alert('Cannot delete the last profile');
      return;
    }
    if (confirm('Are you sure you want to delete this profile?')) {
      setProfiles(profiles.filter(p => p.id !== id));
      if (activeProfileId === id) {
        setActiveProfileId(profiles.find(p => p.id !== id)?.id || '');
      }
    }
  };

  const handleActivateProfile = (profile: AudioProfile) => {
    setActiveProfileId(profile.id);
    // Update the actual settings in localStorage
    localStorage.setItem('av.sensitivity', profile.sensitivity.toString());
    localStorage.setItem('av.led', profile.ledBrightness.toString());
    
    // Dispatch event to notify other components
    window.dispatchEvent(new CustomEvent('profile-activated', { 
      detail: { sensitivity: profile.sensitivity, ledBrightness: profile.ledBrightness }
    }));
    
    alert(`Profile "${profile.name}" activated! Settings will apply on the Live page.`);
  };

  const startEdit = (profile: AudioProfile) => {
    setEditingProfile(profile);
    setFormName(profile.name);
    setFormSensitivity(profile.sensitivity);
    setFormLedBrightness(profile.ledBrightness);
    setShowCreateForm(false);
  };

  const cancelEdit = () => {
    setEditingProfile(null);
    setShowCreateForm(false);
    setFormName('');
    setFormSensitivity(50);
    setFormLedBrightness(128);
  };

  const activeProfile = profiles.find(p => p.id === activeProfileId);

  return (
    <>
      <Breadcrumb pageName="Audio Presets" />

      <div className="grid grid-cols-1 gap-6">
        {/* Active Profile Display */}
        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
            <h3 className="font-medium text-black dark:text-white">
              Active Preset
            </h3>
          </div>
          <div className="p-6.5">
            {activeProfile ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xl font-semibold text-black dark:text-white mb-2">
                      {activeProfile.name}
                    </h4>
                    <p className="text-sm text-bodydark">Currently active audio preset</p>
                  </div>
                  <div className="rounded-full bg-success px-4 py-2 text-sm font-medium text-white">
                    Active
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="rounded-lg border border-stroke bg-gray p-4 dark:border-strokedark dark:bg-meta-4">
                    <p className="text-sm text-bodydark mb-1">Sensitivity</p>
                    <p className="text-2xl font-bold text-black dark:text-white">{activeProfile.sensitivity}</p>
                  </div>
                  <div className="rounded-lg border border-stroke bg-gray p-4 dark:border-strokedark dark:bg-meta-4">
                    <p className="text-sm text-bodydark mb-1">LED Brightness</p>
                    <p className="text-2xl font-bold text-black dark:text-white">{activeProfile.ledBrightness}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-bodydark">No active preset</p>
            )}
          </div>
        </div>

        {/* Profile List */}
        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark flex justify-between items-center">
            <h3 className="font-medium text-black dark:text-white">
              All Presets ({profiles.length})
            </h3>
            {!showCreateForm && !editingProfile && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90"
              >
                <svg className="fill-current" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 7H9V1C9 0.4 8.6 0 8 0C7.4 0 7 0.4 7 1V7H1C0.4 7 0 7.4 0 8C0 8.6 0.4 9 1 9H7V15C7 15.6 7.4 16 8 16C8.6 16 9 15.6 9 15V9H15C15.6 9 16 8.6 16 8C16 7.4 15.6 7 15 7Z"/>
                </svg>
                New Preset
              </button>
            )}
          </div>
          <div className="p-6.5">
            {/* Create/Edit Form */}
            {(showCreateForm || editingProfile) && (
              <div className="mb-6 rounded-lg border-2 border-primary bg-gray p-6 dark:bg-meta-4">
                <h4 className="mb-4 text-lg font-semibold text-black dark:text-white">
                  {editingProfile ? 'Edit Preset' : 'Create New Preset'}
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="mb-2.5 block text-black dark:text-white">
                      Preset Name
                    </label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g., Quiet Room, Concert Hall"
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="mb-2.5 block text-black dark:text-white">
                      Sensitivity: {formSensitivity}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={formSensitivity}
                      onChange={(e) => setFormSensitivity(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="mb-2.5 block text-black dark:text-white">
                      LED Brightness: {formLedBrightness}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="255"
                      value={formLedBrightness}
                      onChange={(e) => setFormLedBrightness(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={editingProfile ? handleUpdateProfile : handleCreateProfile}
                      className="flex justify-center rounded bg-primary p-3 font-medium text-white hover:bg-opacity-90"
                    >
                      {editingProfile ? 'Update' : 'Create'} Preset
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="flex justify-center rounded border border-stroke p-3 font-medium text-black hover:bg-gray dark:border-strokedark dark:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Profiles Grid */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  className={`rounded-lg border-2 p-4 transition-all ${
                    profile.id === activeProfileId
                      ? 'border-success bg-success bg-opacity-10'
                      : 'border-stroke bg-white dark:border-strokedark dark:bg-boxdark'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="text-lg font-semibold text-black dark:text-white">
                      {profile.name}
                    </h4>
                    {profile.id === activeProfileId && (
                      <span className="rounded-full bg-success px-2 py-0.5 text-xs font-medium text-white">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-bodydark">Sensitivity:</span>
                      <span className="font-medium text-black dark:text-white">{profile.sensitivity}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-bodydark">LED Brightness:</span>
                      <span className="font-medium text-black dark:text-white">{profile.ledBrightness}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {profile.id !== activeProfileId && (
                      <button
                        onClick={() => handleActivateProfile(profile)}
                        className="flex-1 rounded bg-primary px-3 py-2 text-xs font-medium text-white hover:bg-opacity-90"
                      >
                        Activate
                      </button>
                    )}
                    <button
                      onClick={() => startEdit(profile)}
                      className="flex-1 rounded border border-stroke px-3 py-2 text-xs font-medium text-black hover:bg-gray dark:border-strokedark dark:text-white dark:hover:bg-meta-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteProfile(profile.id)}
                      className="rounded border border-danger px-3 py-2 text-xs font-medium text-danger hover:bg-danger hover:text-white"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Profile;
