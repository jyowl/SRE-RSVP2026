import { useState, useRef } from 'react'

/**
 * ImageUpload — Drag & drop / click to upload screenshot
 * @param {string} label - Label field
 * @param {File|null} file - File yang dipilih
 * @param {function} onChange - Callback dengan File
 * @param {boolean} error - Tampilkan state error
 * @param {string} hint - Teks hint opsional
 * @param {string} accept - MIME types yang diizinkan
 */
export default function ImageUpload({
  label = 'Upload Screenshot',
  file,
  onChange,
  error,
  hint = 'PNG, JPG, JPEG (maks. 5MB)',
  accept = 'image/png,image/jpeg,image/jpg,image/webp',
  id = 'image-upload',
}) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [preview, setPreview] = useState(null)
  const inputRef = useRef(null)

  function handleFile(selectedFile) {
    if (!selectedFile) return
    if (selectedFile.size > 5 * 1024 * 1024) {
      alert('Ukuran file maksimal 5MB')
      return
    }
    onChange(selectedFile)
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target.result)
    reader.readAsDataURL(selectedFile)
  }

  function handleDrop(e) {
    e.preventDefault()
    setIsDragOver(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      handleFile(droppedFile)
    }
  }

  function handleRemove() {
    onChange(null)
    setPreview(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div>
      {label && (
        <p style={{ fontWeight: 600, color: 'var(--color-text-light)', fontSize: '0.85rem', marginBottom: '8px' }}>
          {label}
        </p>
      )}
      {!preview ? (
        <div
          className={`upload-zone ${isDragOver ? 'dragover' : ''} ${error ? 'error' : ''}`}
          style={error ? { borderColor: 'var(--color-error)' } : {}}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            id={id}
            type="file"
            accept={accept}
            onChange={(e) => handleFile(e.target.files[0])}
            style={{ display: 'none' }}
          />
          <div style={{ pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <div style={{ fontSize: '2.5rem' }}>📷</div>
            <p style={{ fontWeight: 600, color: 'var(--color-text-light)', fontSize: '0.9rem' }}>
              {isDragOver ? 'Lepas file di sini' : 'Klik atau drag & drop gambar'}
            </p>
            <p className="text-muted text-sm">{hint}</p>
          </div>
        </div>
      ) : (
        <div className="upload-preview">
          <img src={preview} alt="Preview" />
          <button
            type="button"
            className="upload-preview-remove"
            onClick={handleRemove}
            title="Hapus gambar"
            aria-label="Hapus gambar yang dipilih"
          >
            ✕
          </button>
          <div style={{
            position: 'absolute',
            bottom: 8,
            left: 8,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(0,0,0,0.65)',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            color: 'white',
          }}>
            {file?.name}
            <a
              href={preview}
              download={file?.name || 'foto.jpg'}
              onClick={(e) => e.stopPropagation()}
              title="Download foto"
              aria-label="Download foto"
              style={{ color: 'var(--color-gold)', lineHeight: 0 }}
            >
              ⬇️
            </a>
          </div>
        </div>
      )}
      {error && (
        <p className="form-error" style={{ marginTop: '8px' }}>
          <span>⚠️</span> {typeof error === 'string' ? error : `Harap upload ${label ? label.toLowerCase() : 'gambar'}`}
        </p>
      )}
    </div>
  )
}
