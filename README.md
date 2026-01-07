# Gánh Hát Lô Tô - README

Ứng dụng web Lô Tô hội chợ truyền thống Việt Nam.

## Cài đặt

```bash
npm install
```

## Chạy development

```bash
npm run dev
```

Mở http://localhost:3000

## Cấu trúc

```
src/
├── app/
│   ├── page.tsx      # Trang chủ
│   ├── host/         # Trang chủ phòng
│   └── play/         # Trang người chơi
├── components/
│   ├── host/         # Components chủ phòng
│   ├── player/       # Components người chơi
│   └── ui/           # Components giao diện
├── hooks/            # React hooks
├── lib/              # Logic nghiệp vụ
└── models/           # MongoDB models
```

## Thêm file âm thanh

Thêm file .mp3 vào:
- `public/audio/essential/` - 01.mp3 đến 99.mp3
- `public/audio/intros/` - spin_start_*.mp3, reveal_*.mp3
- `public/audio/bgm.mp3` - Nhạc nền

## Deploy VPS

```bash
npm run build
npm start
```

Cần cấu hình Nginx reverse proxy với WebSocket support.
