import { NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { cookies } from 'next/headers'

// 添加详细的配置日志
console.log('S3 Configuration:', {
  region: process.env.S3_REGION,
  endpoint: process.env.S3_ENDPOINT,
  bucket: process.env.S3_BUCKET_NAME,
  useR2Subdomain: process.env.USE_R2_SUBDOMAIN,
  r2CustomDomain: process.env.R2_CUSTOM_DOMAIN,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE
})

const s3Client = new S3Client({
  region: process.env.S3_REGION!,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true'
})

// 通用的 URL 生成函数，支持 R2 子域名和 CDN 两种模式
function getPublicUrl(fileName: string) {
  // 使用 R2 子域名模式
  if (process.env.USE_R2_SUBDOMAIN === 'true' && process.env.R2_CUSTOM_DOMAIN) {
    return `${process.env.R2_CUSTOM_DOMAIN.replace(/\/$/, '')}/${fileName}`
  }
  // 使用 CDN/Workers 模式
  else if (process.env.PUBLIC_DOMAIN) {
    return `${process.env.PUBLIC_DOMAIN.replace(/\/$/, '')}/${fileName}`
  }
  // 降级到标准 S3 URL
  else {
    const endpoint = process.env.S3_ENDPOINT?.replace(/\/$/, '')
    const bucket = process.env.S3_BUCKET_NAME
    return `${endpoint}/${bucket}/${fileName}`
  }
}

export async function POST(req: Request) {
  console.log('Upload request received')
  
  const cookieStore = cookies()
  const auth = cookieStore.get('auth')
  if (!auth) {
    console.log('Authentication failed')
    return NextResponse.json(
      { success: false, message: '未登录' },
      { status: 401 }
    )
  }

  try {
    const formData = await req.formData()
    const files = formData.getAll('files')
    
    console.log('Files received:', files.length)
    
    if (!files || files.length === 0) {
      console.log('No files in request')
      return NextResponse.json(
        { success: false, message: '没有上传文件' },
        { status: 400 }
      )
    }

    const uploadedFiles = []

    for (const file of files) {
      if (!(file instanceof File)) {
        console.log('Invalid file object:', file)
        continue
      }

      console.log('Processing file:', {
        name: file.name,
        type: file.type,
        size: file.size
      })

      // 生成文件名
      const timestamp = Date.now()
      const randomStr = Math.random().toString(36).substring(2, 8)
      const ext = file.name.split('.').pop()
      const fileName = `${timestamp}-${randomStr}.${ext}`

      try {
        // 上传到 S3 兼容存储
        const buffer = Buffer.from(await file.arrayBuffer())
        const command = new PutObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: fileName,
          Body: buffer,
          ContentType: file.type,
          CacheControl: 'public, max-age=31536000',
          ACL: 'public-read',
          Metadata: {
            'original-name': file.name,
            'upload-time': new Date().toISOString()
          }
        })

        console.log('Uploading to S3:', {
          bucket: process.env.S3_BUCKET_NAME,
          key: fileName,
          contentType: file.type
        })

        await s3Client.send(command)
        console.log('Upload successful')

        // 生成访问 URL
        const url = getPublicUrl(fileName)
        console.log('Generated URL:', url)
        
        // 添加到结果列表
        uploadedFiles.push({
          originalName: file.name,
          fileName,
          url,
          markdown: `![${file.name}](${url})`,
          bbcode: `[img]${url}[/img]`,
          html: `<img src="${url}" alt="${file.name}" />`,
          size: file.size,
          type: file.type,
          uploadTime: new Date().toISOString()
        })
      } catch (uploadError) {
        console.error('Error uploading file:', fileName, uploadError)
        throw uploadError
      }
    }

    console.log('All files processed successfully')
    return NextResponse.json({
      success: true,
      files: uploadedFiles
    })

  } catch (error) {
    console.error('Upload error:', error instanceof Error ? error.message : error)
    if (error instanceof Error) {
      return NextResponse.json(
        { 
          success: false, 
          message: '上传失败',
          error: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        },
        { status: 500 }
      )
    }
    return NextResponse.json(
      { success: false, message: '上传失败' },
      { status: 500 }
    )
  }
}
