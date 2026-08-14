/**
 * CateringPicker — Tampilkan kartu foto menu catering, support multi-select
 * @param {Array} options - Array of { id, name, image_url, price }
 * @param {Array} value - Array of selected option IDs (multi-select)
 * @param {function} onChange - Callback dengan array IDs yang dipilih
 * @param {function} onPriceChange - Callback dengan total harga (number)
 * @param {boolean} error - Tampilkan state error
 * @param {boolean} multiSelect - Jika true, bisa pilih banyak (default: true)
 */
export default function CateringPicker({ options = [], value = [], onChange, onPriceChange, error, multiSelect = true }) {
  if (!options || options.length === 0) {
    return (
      <div className="alert alert-info">
        <span>ℹ️</span>
        <span>Tidak ada pilihan catering untuk acara ini.</span>
      </div>
    )
  }

  const selectedIds = Array.isArray(value) ? value : (value ? [value] : [])

  function formatRupiah(amount) {
    if (!amount && amount !== 0) return null
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  function recalcPrice(ids) {
    if (!onPriceChange) return
    const hasPriceData = options.some(o => o.price != null)
    if (!hasPriceData) {
      onPriceChange(null)
      return
    }
    const total = ids.reduce((sum, id) => {
      const opt = options.find(o => o.id === id)
      return sum + (opt?.price ?? 0)
    }, 0)
    onPriceChange(total)
  }

  function handleSelect(option) {
    let newSelected
    if (multiSelect) {
      if (selectedIds.includes(option.id)) {
        newSelected = selectedIds.filter(id => id !== option.id)
      } else {
        newSelected = [...selectedIds, option.id]
      }
    } else {
      newSelected = selectedIds.includes(option.id) ? [] : [option.id]
    }
    onChange(newSelected)
    recalcPrice(newSelected)
  }

  const isSelected = (id) => selectedIds.includes(id)

  const foodItems = options.filter((o) => (o.category || 'food') === 'food')
  const drinkItems = options.filter((o) => o.category === 'drink')
  const hasCategories = drinkItems.length > 0

  function renderCard(option) {
    return (
      <button
        key={option.id}
        type="button"
        className={`catering-card ${isSelected(option.id) ? 'selected' : ''}`}
        onClick={() => handleSelect(option)}
        aria-pressed={isSelected(option.id)}
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
          {option.price != null && (
            <span className="catering-card-price">
              {option.price === 0 ? 'Gratis' : formatRupiah(option.price)}
            </span>
          )}
          <div className="catering-check">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 5l2.5 2.5L8 3" stroke="#0d1f1a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </button>
    )
  }

  return (
    <div>
      {multiSelect && selectedIds.length > 0 && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          marginBottom: '12px',
          padding: '4px 12px',
          borderRadius: '20px',
          background: 'rgba(232,184,75,0.12)',
          border: '1px solid rgba(232,184,75,0.3)',
          fontSize: '0.8rem',
          fontWeight: 600,
          color: 'var(--color-gold)',
        }}>
          ✓ {selectedIds.length} menu dipilih
        </div>
      )}

      <div style={error ? { outline: '2px solid var(--color-error)', borderRadius: 'var(--radius-md)', outlineOffset: '4px', padding: '2px' } : {}}>
        {hasCategories ? (
          <>
            {foodItems.length > 0 && (
              <div className="menu-group">
                <div className="menu-group-title">🍽️ Food</div>
                <div className="catering-grid">{foodItems.map(renderCard)}</div>
              </div>
            )}
            {drinkItems.length > 0 && (
              <div className="menu-group">
                <div className="menu-group-title">🥤 Drink</div>
                <div className="catering-grid">{drinkItems.map(renderCard)}</div>
              </div>
            )}
          </>
        ) : (
          <div className="catering-grid">{options.map(renderCard)}</div>
        )}
      </div>

      {error && (
        <p className="form-error" style={{ marginTop: '8px' }}>
          <span>⚠️</span> {typeof error === 'string' ? error : 'Pilih minimal satu menu catering'}
        </p>
      )}
    </div>
  )
}
