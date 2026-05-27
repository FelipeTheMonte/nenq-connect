import React, { useEffect, useState } from 'react';

export default function PageTransition({ children, tabKey }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, [tabKey]);

  return (
    <div style={{
      height: '100%',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0px)' : 'translateY(10px)',
      transition: 'opacity 0.22s ease, transform 0.22s ease',
    }}>
      {children}
    </div>
  );
}
