import React from 'react';
import './BrandLogo.css';

export interface BrandLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  showText?: boolean;
  showAiBadge?: boolean;
  subtitle?: string;
  className?: string;
  animateOnHover?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showText = true,
  showAiBadge = true,
  subtitle,
  className = '',
  animateOnHover = true,
}) => {
  const pixelSize = typeof size === 'number'
    ? size
    : size === 'xs'
    ? 24
    : size === 'sm'
    ? 28
    : size === 'md'
    ? 34
    : size === 'lg'
    ? 44
    : 56;

  const textFontSize = typeof size === 'number'
    ? Math.max(14, Math.round(size * 0.44))
    : size === 'xs'
    ? 13
    : size === 'sm'
    ? 14
    : size === 'md'
    ? 16
    : size === 'lg'
    ? 20
    : 26;

  return (
    <div
      className={`studyflow-brand ${animateOnHover ? 'studyflow-brand--interactive' : ''} ${className}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: pixelSize > 34 ? 12 : 9 }}
    >
      {/* Visual Logo Emblem */}
      <div
        className="studyflow-logo-emblem"
        style={{
          width: pixelSize,
          height: pixelSize,
          minWidth: pixelSize,
          minHeight: pixelSize,
        }}
      >
        <svg
          viewBox="0 0 64 64"
          width="100%"
          height="100%"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="studyflow-logo-svg"
        >
          <defs>
            {/* Background Squircle Gradient */}
            <linearGradient id="logoBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="50%" stopColor="#0c1222" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* Precision Chamfer Rim */}
            <linearGradient id="logoRim" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(56, 189, 248, 0.55)" />
              <stop offset="40%" stopColor="rgba(99, 102, 241, 0.35)" />
              <stop offset="100%" stopColor="rgba(168, 85, 247, 0.45)" />
            </linearGradient>

            {/* Flow Path Gradient */}
            <linearGradient id="logoFlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>

            {/* AI Core Star Gradient */}
            <linearGradient id="logoStar" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="50%" stopColor="#e0f2fe" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>

            {/* AI Soft Glow */}
            <filter id="aiGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Squircle Chassis */}
          <rect
            width="64"
            height="64"
            rx="18"
            fill="url(#logoBg)"
            className="logo-chassis"
          />
          <rect
            width="64"
            height="64"
            rx="18"
            fill="none"
            stroke="url(#logoRim)"
            strokeWidth="1.6"
          />

          {/* Academic Neural Track (Subtle orbit guide) */}
          <path
            d="M17 37 C 17 25, 27 17, 37 17 C 45 17, 49 23, 49 29 C 49 37, 39 45, 29 45 C 21 45, 17 41, 17 37 Z"
            fill="none"
            stroke="rgba(56, 189, 248, 0.16)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Primary S-Flow Ribbon (Learning Flow) */}
          <path
            d="M20 45 C 15 41, 15 32, 23 25 C 29 20, 37 20, 43 15 C 46 12, 45 8, 40 8 C 33 8, 30 13, 29 16"
            fill="none"
            stroke="url(#logoFlow)"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="logo-ribbon-top"
          />

          {/* Inverse Flow Return (Infinity/Möbius Study Loop) */}
          <path
            d="M44 19 C 49 23, 49 32, 41 39 C 35 44, 27 44, 21 49 C 18 52, 19 56, 24 56 C 31 56, 34 51, 35 48"
            fill="none"
            stroke="url(#logoFlow)"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="logo-ribbon-bottom"
          />

          {/* Synaptic AI Neural Nodes */}
          <circle cx="29" cy="16" r="2.4" fill="#38bdf8" />
          <circle cx="35" cy="48" r="2.4" fill="#a855f7" />

          {/* Core AI Intelligence Star (4-Point Star Sparkle) */}
          <g filter="url(#aiGlow)" className="logo-spark-group">
            <path
              d="M32 20 C 32 27, 39 32, 46 32 C 39 32, 32 37, 32 44 C 32 37, 25 32, 18 32 C 25 32, 32 27, 32 20 Z"
              fill="url(#logoStar)"
              className="logo-ai-spark"
            />
            <circle cx="32" cy="32" r="2.4" fill="#ffffff" />
          </g>

          {/* Orbiting AI Sparklets */}
          <circle cx="44" cy="21" r="1.5" fill="#38bdf8" opacity="0.9" />
          <circle cx="20" cy="43" r="1.5" fill="#c084fc" opacity="0.9" />
        </svg>
      </div>

      {/* Brand Typography & AI Badge */}
      {showText && (
        <div className="studyflow-brand-info">
          <div className="studyflow-brand-row">
            <span
              className="studyflow-brand-title"
              style={{ fontSize: textFontSize }}
            >
              StudyFlow
            </span>

            {showAiBadge && (
              <span className="studyflow-ai-pill">
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="studyflow-ai-pill-spark"
                >
                  <path
                    d="M8 0 C8 5 11 8 16 8 C11 8 8 11 8 16 C8 11 5 8 0 8 C5 8 8 5 8 0 Z"
                    fill="currentColor"
                  />
                </svg>
                AI
              </span>
            )}
          </div>

          {subtitle && (
            <span className="studyflow-brand-subtitle">{subtitle}</span>
          )}
        </div>
      )}
    </div>
  );
};
export default BrandLogo;
