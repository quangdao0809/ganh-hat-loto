#!/bin/bash

# Voice to use
VOICE="Linh"

# Create directories
mkdir -p public/audio/essential
mkdir -p public/audio/variants
mkdir -p public/audio/intros

echo "🎙️ Generating audio with voice: $VOICE"

# 1. Essential Sounds (1-90)
echo "Generating essential sounds..."
for i in {1..90}; do
  PADDED=$(printf "%02d" $i)
  TEXT="Số $i"
  say -v "$VOICE" -o "public/audio/essential/$PADDED.m4a" "$TEXT"
  
  # Create directory for variants
  mkdir -p "public/audio/variants/$PADDED"
done

# 2. Variants (1-90)
echo "Generating variant sounds..."
for i in {1..90}; do
  PADDED=$(printf "%02d" $i)
  
  # Simple variant 1
  TEXT="Cờ ra con mấy, con mấy gì đây... dạ con số $i"
  say -v "$VOICE" -o "public/audio/variants/$PADDED/v1.m4a" "$TEXT"
  
  # Simple variant 2
  TEXT="Lô tô xin đưa, con số gì ra... là con số $i"
  say -v "$VOICE" -o "public/audio/variants/$PADDED/v2.m4a" "$TEXT"
done

# 3. Intros
echo "Generating intros..."
# Spin start
for i in {1..5}; do
  TEXT="Mời bà con cô bác cùng dò số..."
  say -v "$VOICE" -o "public/audio/intros/spin_start_$i.m4a" "$TEXT"
done

# Reveal intros
for i in {1..10}; do
  TEXT="Số gì đây, số gì đây..."
  say -v "$VOICE" -o "public/audio/intros/reveal_$i.m4a" "$TEXT"
done

echo "✅ Audio generation complete!"
