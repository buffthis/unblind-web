import { useAuth } from '@contexts/AuthContext';
import useClickOutside from '@hooks/useClickOutside';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { POST_EDITOR_ENABLED } from '@/config';

export default function useProfileDropdown() {
  const { user, loading, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useClickOutside(dropdownRef, () => setIsDropdownOpen(false));

  useEffect(() => {
    if (!isDropdownOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setIsDropdownOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isDropdownOpen]);

  const handleProfileClick = () => {
    setIsDropdownOpen((open) => !open);
  };

  const handleMyPage = () => {
    setIsDropdownOpen(false);
    if (user?.username) {
      navigate(`/${user.username}`);
    }
  };

  const handleWrite = () => {
    setIsDropdownOpen(false);
    navigate('/posts/new');
  };

  const handleLogout = async () => {
    setIsDropdownOpen(false);
    await logout();
    navigate('/');
  };

  return {
    user,
    loading,
    isDropdownOpen,
    dropdownRef,
    handleProfileClick,
    handleMyPage,
    handleWrite: POST_EDITOR_ENABLED ? handleWrite : undefined,
    handleLogout,
  };
}
