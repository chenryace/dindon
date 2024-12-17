'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import styles from './home.module.css'

// 网站标题
const SITE_TITLE = "图床服务"

// 定义上传文件类型
interface UploadFile extends File {
  preview: string
  url?: string
  markdown?: string
  bbcode?: string
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
  const router = useRouter()
  const [files, setFiles] = useState<UploadFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 处理拖拽事件
  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(e.type === "dragenter" || e.type === "dragover")
  }

  // 处理文件拖放
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    await processFiles(droppedFiles as File[])
  }

  // 处理文件选择
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      await processFiles(selectedFiles as File[])
    }
  }

  // 处理文件处理和自动上传
  const processFiles = async (newFiles: File[]) => {
    // 限制最多9张图片
    const imageFiles = newFiles
      .filter(file => file.type.startsWith('image/'))
      .slice(0, 9 - files.length)

    if (imageFiles.length === 0) {
      alert('请选择图片文件')
      return
    }

    console.log('Processing files:', imageFiles.length)
    const processedFiles = imageFiles.map(file => ({
      ...file,
      preview: URL.createObjectURL(file)
    })) as UploadFile[]

    setFiles(prev => [...prev, ...processedFiles])
    
    // 自动上传
    await handleUpload(processedFiles)
  }

  // 处理文件上传
  const handleUpload = async (filesToUpload: UploadFile[]) => {
    if (filesToUpload.length === 0) return

    setIsUploading(true)
    const formData = new FormData()
    filesToUpload.forEach(file => formData.append('files', file))

    try {
      console.log('Starting upload...')
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'same-origin'
      })

      const result = await response.json() as UploadResponse
      console.log('Upload response:', result)

      if (!response.ok) {
        throw new Error(result.message || '上传失败')
      }

      if (result.success && result.files) {
        console.log('Upload successful, updating files...')
        // 更新文件的 URL 信息
        setFiles(prev => prev.map(file => {
          const uploadedFile = result.files?.find(
            (f) => f.originalName === file.name
          )
          console.log('Matching file:', file.name, uploadedFile)
          if (uploadedFile) {
            return {
              ...file,
              url: uploadedFile.url,
              markdown: uploadedFile.markdown,
              bbcode: uploadedFile.bbcode
            }
          }
          return file
        }))
      } else {
        throw new Error(result.message || '上传失败')
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert(error instanceof Error ? error.message : '上传失败，请重试')
    } finally {
      setIsUploading(false)
    }
  }

  // 处理登出
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