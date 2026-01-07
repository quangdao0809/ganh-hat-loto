'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { GlassCard } from '@/components/ui/GlassCard';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      {/* Hero Section */}
      <motion.div
        className="text-center mb-12"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="text-8xl mb-6"
          animate={{
            rotate: [0, 5, -5, 0],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          🎪
        </motion.div>

        <h1 className="text-5xl md:text-6xl font-bold mb-4">
          <span className="text-gradient">Gánh Hát Lô Tô</span>
        </h1>

        <p className="text-xl text-[var(--text-secondary)] max-w-md mx-auto">
          Trải nghiệm Lô Tô hội chợ truyền thống Việt Nam ngay trên điện thoại
        </p>
      </motion.div>

      {/* Action Cards */}
      <div className="grid gap-6 md:grid-cols-2 w-full max-w-2xl">
        {/* Host Card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Link href="/host" className="block">
            <GlassCard className="text-center py-8 cursor-pointer group">
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">
                👑
              </div>
              <h2 className="text-2xl font-bold mb-2 text-[var(--neon-gold)]">
                Tạo Phòng
              </h2>
              <p className="text-[var(--text-secondary)]">
                Làm chủ đài, quay số và rao vui
              </p>
            </GlassCard>
          </Link>
        </motion.div>

        {/* Player Card */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Link href="/play" className="block">
            <GlassCard className="text-center py-8 cursor-pointer group">
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">
                🎟️
              </div>
              <h2 className="text-2xl font-bold mb-2 text-[var(--neon-cyan)]">
                Vào Phòng
              </h2>
              <p className="text-[var(--text-secondary)]">
                Tham gia chơi, mua vé, hô kinh
              </p>
            </GlassCard>
          </Link>
        </motion.div>
      </div>

      {/* Features */}
      <motion.div
        className="mt-16 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h3 className="text-lg font-semibold text-[var(--text-secondary)] mb-6">
          Tính năng nổi bật
        </h3>

        <div className="flex flex-wrap justify-center gap-4 max-w-lg">
          {[
            { icon: '🔊', text: 'Hát rao tự động' },
            { icon: '📱', text: 'Chơi trên điện thoại' },
            { icon: '🎯', text: 'Dò số tự động' },
            { icon: '🏆', text: 'Xác nhận thắng' },
            { icon: '👥', text: 'Nhiều người chơi' },
            { icon: '🔗', text: 'Chia sẻ mã QR' },
          ].map((feature, idx) => (
            <motion.div
              key={idx}
              className="glass px-4 py-2 text-sm"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 + idx * 0.1 }}
            >
              <span className="mr-2">{feature.icon}</span>
              {feature.text}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Footer */}
      <motion.footer
        className="mt-16 text-center text-sm text-[var(--text-muted)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <p>Trò chơi giải trí gia đình • Không cá cược • Miễn phí</p>
      </motion.footer>
    </div>
  );
}
