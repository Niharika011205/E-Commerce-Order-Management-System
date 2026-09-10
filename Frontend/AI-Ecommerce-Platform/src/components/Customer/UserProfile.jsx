import React, { useState, useEffect } from 'react';
import { getUserProfile, updateUserProfile, deleteUserAccount, updatePassword, getUserAddresses, addAddress, deleteAddress, setDefaultAddress } from '../../api/userApi';
import { Button } from '../common/Button';
import { Loader } from '../common/Loader';
import { useToast } from '../common/ToastProvider';
import '../../styles/customer.css';

export function UserProfile({ user, onBack }) {
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Profile Edit State
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ firstName: '', lastName: '', username: '', email: '', phone: '' });
  const [profileError, setProfileError] = useState(null);

  // Password Update State
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordError, setPasswordError] = useState(null);
  const [passwordSuccess, setPasswordSuccess] = useState(null);

  // Address Form State
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState({ fullName: '', addressLine1: '', addressLine2: '', city: '', state: '', zipCode: '', country: '', isDefault: false });
  const [addressError, setAddressError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [profileData, addressesData] = await Promise.all([
        getUserProfile(),
        getUserAddresses()
      ]);
      setProfile(profileData);
      setProfileForm({ 
        firstName: profileData?.firstName || '', 
        lastName: profileData?.lastName || '', 
        username: profileData?.username || '',
        email: profileData?.email || '',
        phone: profileData?.phone || '' 
      });
      setAddresses(addressesData || []);
    } catch (err) {
      setError(err.message || 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError(null);
    try {
      const response = await updateUserProfile(profileForm);
      setProfile(response.user);
      setEditingProfile(false);
      toast.success('Profile updated successfully');
      if (response.requiresRelogin) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    } catch (err) {
      setProfileError(err.message || 'Failed to update profile');
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    try {
      await updatePassword({
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword
      });
      setPasswordSuccess("Password updated successfully.");
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPasswordError(err.message || 'Failed to update password');
    }
  };

  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    setAddressError(null);
    try {
      await addAddress(addressForm);
      setShowAddressForm(false);
      setAddressForm({ fullName: '', addressLine1: '', addressLine2: '', city: '', state: '', zipCode: '', country: '', isDefault: false });
      fetchData();
      toast.success('Address added');
    } catch (err) {
      setAddressError(err.message || 'Failed to add address');
    }
  };

  const handleDeleteAddress = async (id) => {
    try {
      await deleteAddress(id);
      fetchData();
      toast.info('Address deleted');
    } catch (err) {
      setAddressError(err.message || 'Failed to delete address');
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await setDefaultAddress(id);
      fetchData();
      toast.success('Default address updated');
    } catch (err) {
      setAddressError(err.message || 'Failed to set default address');
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteUserAccount();
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      window.location.href = '/';
    } catch (err) {
      toast.error(err.message || 'Failed to delete account');
    }
  };

  if (loading) return <Loader text="Loading profile..." />;
  if (error) return <div className="flash flash-error">{error}</div>;

  return (
    <div className="user-profile-container" style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2>Your Account</h2>
        <Button variant="outline" onClick={onBack}>Back to Store</Button>
      </div>

      {/* Profile Section */}
      <div className="profile-section" style={{ background: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3>Personal Information</h3>
          {!editingProfile && (
            <Button variant="outline" onClick={() => setEditingProfile(true)}>Edit</Button>
          )}
        </div>
        
        {profileError && <p style={{ color: '#ef4444', marginBottom: '16px' }}>{profileError}</p>}

        {editingProfile ? (
          <form onSubmit={handleProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '0.9rem', color: '#64748b' }}>Note: Changing your username or email will require you to log in again.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>First Name</label>
                <input type="text" required value={profileForm.firstName} onChange={e => setProfileForm({...profileForm, firstName: e.target.value})} style={{ width: '100%', padding: '8px' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Last Name</label>
                <input type="text" required value={profileForm.lastName} onChange={e => setProfileForm({...profileForm, lastName: e.target.value})} style={{ width: '100%', padding: '8px' }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Username</label>
                <input type="text" required value={profileForm.username} onChange={e => setProfileForm({...profileForm, username: e.target.value})} style={{ width: '100%', padding: '8px' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Email Address</label>
                <input type="email" required value={profileForm.email} onChange={e => setProfileForm({...profileForm, email: e.target.value})} style={{ width: '100%', padding: '8px' }} />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Phone</label>
              <input type="text" value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} style={{ width: '100%', padding: '8px' }} />
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <Button type="submit">Save Changes</Button>
              <Button variant="outline" type="button" onClick={() => setEditingProfile(false)}>Cancel</Button>
            </div>
          </form>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', color: '#475569' }}>
            <p><strong>Name:</strong> {profile?.firstName} {profile?.lastName}</p>
            <p><strong>Username:</strong> {profile?.username}</p>
            <p><strong>Email:</strong> {profile?.email}</p>
            <p><strong>Phone:</strong> {profile?.phone}</p>
          </div>
        )}
      </div>

      {/* Password Update Section */}
      <div className="password-section" style={{ background: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '16px' }}>Update Password</h3>
        
        {passwordError && <p style={{ color: '#ef4444', marginBottom: '16px' }}>{passwordError}</p>}
        {passwordSuccess && <p style={{ color: '#22c55e', marginBottom: '16px' }}>{passwordSuccess}</p>}

        <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>enter old password</label>
            <input type="password" required value={passwordForm.oldPassword} onChange={e => setPasswordForm({...passwordForm, oldPassword: e.target.value})} style={{ width: '100%', padding: '8px' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>enter new password</label>
            <input type="password" required value={passwordForm.newPassword} onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})} style={{ width: '100%', padding: '8px' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>enter new password second time (Confirm password again)</label>
            <input type="password" required value={passwordForm.confirmPassword} onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})} style={{ width: '100%', padding: '8px' }} />
          </div>
          <div>
            <Button type="submit">Update Password</Button>
          </div>
        </form>
      </div>

      {/* Addresses Section */}
      <div className="addresses-section" style={{ background: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3>Address Book</h3>
          <Button variant="outline" onClick={() => setShowAddressForm(!showAddressForm)}>
            {showAddressForm ? 'Cancel' : 'Add New Address'}
          </Button>
        </div>
        
        {addressError && <p style={{ color: '#ef4444', marginBottom: '16px' }}>{addressError}</p>}

        {showAddressForm && (
          <form onSubmit={handleAddressSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: '#f8fafc', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Full Name</label>
              <input type="text" value={addressForm.fullName} onChange={e => setAddressForm({...addressForm, fullName: e.target.value})} placeholder="Leave blank to use profile name" style={{ width: '100%', padding: '8px' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Address Line 1</label>
              <input type="text" required value={addressForm.addressLine1} onChange={e => setAddressForm({...addressForm, addressLine1: e.target.value})} style={{ width: '100%', padding: '8px' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Address Line 2 (Optional)</label>
              <input type="text" value={addressForm.addressLine2} onChange={e => setAddressForm({...addressForm, addressLine2: e.target.value})} style={{ width: '100%', padding: '8px' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>City</label>
                <input type="text" required value={addressForm.city} onChange={e => setAddressForm({...addressForm, city: e.target.value})} style={{ width: '100%', padding: '8px' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>State</label>
                <input type="text" required value={addressForm.state} onChange={e => setAddressForm({...addressForm, state: e.target.value})} style={{ width: '100%', padding: '8px' }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>ZIP Code</label>
                <input type="text" required value={addressForm.zipCode} onChange={e => setAddressForm({...addressForm, zipCode: e.target.value})} style={{ width: '100%', padding: '8px' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Country</label>
                <input type="text" required value={addressForm.country} onChange={e => setAddressForm({...addressForm, country: e.target.value})} style={{ width: '100%', padding: '8px' }} />
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" checked={addressForm.isDefault} onChange={e => setAddressForm({...addressForm, isDefault: e.target.checked})} />
              Set as default address
            </label>
            <div style={{ marginTop: '8px' }}>
              <Button type="submit">Save Address</Button>
            </div>
          </form>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {addresses.length === 0 && !showAddressForm && (
            <p style={{ color: '#64748b' }}>No addresses saved yet.</p>
          )}
          {addresses.map(addr => (
            <div key={addr.id} style={{ border: addr.isDefault ? '2px solid #3b82f6' : '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', position: 'relative' }}>
              {addr.isDefault && (
                <span style={{ position: 'absolute', top: '-10px', right: '16px', background: '#3b82f6', color: '#fff', fontSize: '12px', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                  Default
                </span>
              )}
              <p style={{ margin: '0 0 4px 0', fontWeight: '600' }}>{addr.fullName}</p>
              <p style={{ margin: '0 0 4px 0', color: '#475569' }}>{addr.addressLine1} {addr.addressLine2}</p>
              <p style={{ margin: '0 0 4px 0', color: '#475569' }}>{addr.city}, {addr.state} {addr.zipCode}</p>
              <p style={{ margin: '0 0 16px 0', color: '#475569' }}>{addr.country}</p>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button variant="outline" onClick={() => handleDeleteAddress(addr.id)} style={{ padding: '4px 8px', fontSize: '12px', color: '#ef4444', borderColor: '#ef4444' }}>Delete</Button>
                {!addr.isDefault && (
                  <Button variant="outline" onClick={() => handleSetDefault(addr.id)} style={{ padding: '4px 8px', fontSize: '12px' }}>Set Default</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="danger-zone" style={{ background: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #fee2e2', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
          ⚠️ Danger Zone
        </h3>
        <p style={{ color: '#64748b', marginBottom: '16px' }}>
          Once you delete your account, there is no going back. Please be certain. This will permanently delete your profile and empty your shopping cart.
        </p>
        <Button onClick={handleDeleteAccount} style={{ background: '#ef4444', borderColor: '#ef4444' }}>
          Delete Account
        </Button>
      </div>
    </div>
  );
}
