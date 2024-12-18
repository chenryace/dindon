'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'     //
import styles from './home.module.css'    //

// 网站标题
const SITE_TITLE = "图床服务"

// 定义上传文件类型
interface UploadedFile {
  originalName: string
  fileName: string
  url: string
  markdown: string
  bbcode: string
  html: string
  size: number
  type: string
  uploadTime: string
}

// 定义上传响应类型
interface UploadResponse {
  success: boolean
  files?: Array<{
    originalName: string
    fileName: string
    url: string
    markdown: string
    bbcode: string
    size: number
    type: string
    uploadTime: string
  }>
  message?: string
  error?: string
}

export default function HomePage() {
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [images, setImages] = useState<UploadedFile[]>([])
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const [isDarkMode, setIsDarkMode] = useState(false)

  ///////////// 加载已上传的图片
  useEffect(() => {
    fetch('/api/images')
      .then(res => res.json())
      .then(data => setImages(data))
      .catch(err => console.error('Failed to load images:', err))
  }, [])

  //// 处理拖拽事件//
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  // 处理文件拖放//
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      await handleUpload(files)
    }
  }

  // 处理文件拖放//
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      await handleUpload(files)
    }
  }

  // 处理文件处理和自动上传//////////////////////////////////////////////
  const handleUpload = async (files: File[]) => {
    setIsUploading(true)
    
    try {
      const formData = new FormData()
      files.forEach(file => {
        formData.append('files', file)
      })

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (!res.ok) {
        throw new Error('上传失败')
      }

      const data = await res.json()
      console.log('Upload success:', data)
      
      // 添加新上传的图片到列表
      setImages(prev => [...data.files, ...prev])
    } catch (error) {
      console.error('Upload error:', error)
      alert('上传失败，请重试')
    } finally {
      setIsUploading(false)
    }
  }

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopiedIndex(index)
        setTimeout(() => setCopiedIndex(null), 2000)
      })
      .catch(err => console.error('Failed to copy:', err))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
  }

  ///////////// 处理登出
  const handleLogout = async () => {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'same-origin'
      })
      window.location.href = '/login'
    } catch (error) {
      console.error('登出失败:', error)
    }
  }

  // 清理预览 URL
  useEffect(() => {
    return () => {
      files.forEach(file => {
        if (file.preview) URL.revokeObjectURL(file.preview)
      })
    }
  }, [files])

  return (
    <div className={styles.container} data-theme={isDarkMode ? 'night' : 'day'}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Image
            src="/favicon.ico"
            alt="Logo"
            width={32}
            height={32}
            className={styles.favicon}
          />
          <h1 className={styles.title}>{SITE_TITLE}</h1>
        </div>
        <div className={styles.buttonGroup}>
          <button className={`${styles.navButton} ${styles.uploadNavButton}`}>
            上传图片
          </button>
          <button
            onClick={() => router.push('/manage')}
            className={`${styles.navButton} ${styles.manageButton}`}
          >
            图片管理
          </button>
          <button
            onClick={handleLogout}
            className={`${styles.navButton} ${styles.logoutButton}`}
          >
            退出登录
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.uploadSection}>
          <div
            className={`${styles.dropzone} ${dragActive ? styles.dropzoneActive : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              accept="image/*"
              style={{ display: 'none' }}
            />
            <p className={styles.dropzoneText}>
              {isUploading ? '上传中...' : '点击或拖拽图片到这里'}
            </p>
            <p className={styles.dropzoneSubtext}>
              支持 JPG、PNG、GIF 等图片格式（最多9张）
            </p>
          </div>
        </div>

        {files.length > 0 && (
          <div className={styles.previewSection}>
            <h3 className={styles.previewTitle}>
              已上传 {files.length} 张图片
            </h3>
            <div className={styles.previewGrid}>
              {files.map((file, index) => (
                <div key={index} className={styles.previewItem}>
                  <div className={styles.previewImageWrapper}>
                    <Image
                      src={file.preview}
                      alt={file.name}
                      fill
                      className={styles.previewImage}
                      sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                    />
                  </div>
                  {file.url && (
                    <div className={styles.urlSection}>
                      <div>
                        <p className={styles.urlTitle}>直链：</p>
                        <p className={styles.urlText}>{file.url}</p>
                      </div>
                      <div>
                        <p className={styles.urlTitle}>Markdown：</p>
                        <p className={styles.urlText}>{file.markdown}</p>
                      </div>
                      <div>
                        <p className={styles.urlTitle}>BBCode：</p>
                        <p className={styles.urlText}>{file.bbcode}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 主题切换按钮 */}
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            padding: '1rem',
            borderRadius: '50%',
            background: isDarkMode ? '#fff' : '#000',
            color: isDarkMode ? '#000' : '#fff',
            cursor: 'pointer',
            border: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
          }}
        >
          {isDarkMode ? '🌞' : '🌙'}
        </button>
      </main>
    </div>
  )
} 
