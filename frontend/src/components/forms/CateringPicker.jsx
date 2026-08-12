import { useState, useEffect, useRef } from 'react'

/**
 * CateringPicker — Tampilkan kartu foto menu catering, user klik untuk pilih
 * @param {Array} options - Array of { id, name, image_url }
 * @param {string} value - ID menu yang dipilih
 * @param {function} onChange - Callback dengan ID menu yang dipilih
 * @param {boolean} error - Tampilkan state error
 */
export default function CateringPicker({ options = [], value, onChange, error }) {
  if (!options || options.length === 0) {
    return (
      <div className="alert alert-info">
        <span>ℹ️</span>
        <span>Tidak ada pilihan catering untuk acara ini.</span>
      </div>
    )
  }

  return (
    <div>
      <div className={`catering-grid`} style={error ? { outline: '2px solid var(--color-error)', borderRadius: 'var(--radius-md)', outlineOffset: '4px' } : {}}>
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`catering-card ${value === option.id ? 'selected' : ''}`}
            onClick={() => onChange(option.id)}
            aria-pressed={value === option.id}
            id={`catering-option-${option.id}`}
          >
            {option.image_url ? (
              <img
                src={option.image_url}
                alt={option.name}
                className="catering-card-img"
                onError={(e) => {
                  e.target.style.display = 'none'
                  e.target.nextSibling.style.display = 'flex'
                }}
              />
            ) : null}
            <div
              className="catering-card-img-placeholder"
              style={{ display: option.image_url ? 'none' : 'flex' }}
            >
              🍽️
            </div>
            <div className="catering-card-label">
              <span style={{ lineHeight: 1.3 }}>{option.name}</span>
              <div className="catering-check">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5l2.5 2.5L8 3" stroke="#0d1f1a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </button>
        ))}
      </div>
      {error && (
        <p className="form-error" style={{ marginTop: '8px' }}>
          <span>⚠️</span> Pilih salah satu menu catering
        </p>
      )}
    </div>
  )
}
