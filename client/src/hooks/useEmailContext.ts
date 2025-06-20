import { useState, useEffect } from 'react';

export const useEmailContext = () => {
  const [userEmail, setUserEmail] = useState<string>(() => {
    return localStorage.getItem('userEmail') || 'clint.phillips@thecenter.nasdaq.org';
  });

  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    const email = localStorage.getItem('userEmail') || 'clint.phillips@thecenter.nasdaq.org';
    return email === 'admin@tight5digital.com';
  });

  useEffect(() => {
    // Initialize email context on app start
    if (!localStorage.getItem('userEmail')) {
      localStorage.setItem('userEmail', 'clint.phillips@thecenter.nasdaq.org');
    }

    // Update admin status when email changes
    const email = localStorage.getItem('userEmail') || 'clint.phillips@thecenter.nasdaq.org';
    setUserEmail(email);
    setIsAdmin(email === 'admin@tight5digital.com');
  }, []);

  const switchEmail = (email: string) => {
    localStorage.setItem('userEmail', email);
    setUserEmail(email);
    setIsAdmin(email === 'admin@tight5digital.com');
  };

  return {
    userEmail,
    isAdmin,
    switchEmail,
  };
};

export default useEmailContext;