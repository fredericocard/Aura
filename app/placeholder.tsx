"use client";

export default function Placeholder({ 
  name, 
  description, 
  number 
}: { 
  name: string; 
  description: string; 
  number: string;
}) {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#F5EFE2',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Instrument Sans', sans-serif",
      padding: '40px 24px',
      textAlign: 'center',
    }}>
      <div style={{
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: '0.16em',
        textTransform: 'uppercase' as const,
        color: '#B06B2C',
        marginBottom: 12,
      }}>
        Wireframe {number}
      </div>
      <h1 style={{
        fontFamily: "'Young Serif', serif",
        fontSize: 32,
        color: '#2B2118',
        marginBottom: 8,
        fontWeight: 400,
      }}>
        {name}
      </h1>
      <p style={{
        fontSize: 14,
        color: '#8A7E6F',
        maxWidth: 300,
        lineHeight: 1.5,
        marginBottom: 32,
      }}>
        {description}
      </p>
      <div style={{
        padding: '8px 20px',
        borderRadius: 999,
        background: 'rgba(47,93,58,0.1)',
        color: '#2F5D3A',
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase' as const,
      }}>
        Coming soon
      </div>
      <a href="/" style={{
        marginTop: 40,
        fontSize: 13,
        color: '#B06B2C',
        textDecoration: 'none',
      }}>
        ← Back to all screens
      </a>
    </div>
  );
}
