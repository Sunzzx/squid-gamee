# Squid Game: Red Light, Green Light (3D WebGL Recreation)

A 3D WebGL recreation of the iconic **Squid Game: Red Light, Green Light** minigame (based on Roblox Experience `7554888362`), built with Three.js, Vanilla CSS, and Web Audio API.

![Squid Game X](images/squid_game_x_icon.png)

## Features

- **Authentic Korean Doll Voice:** Plays the real *"무궁화 꽃이 피었습니다"* (Mugunghwa kkochi pieot seumnida) vocal recording with increasing tempo across rounds.
- **Atmospheric Audio:** "Pink Soldiers" theme music, sniper gunshot audio with sub-bass kick, accelerating heartbeat pulse during Red Light, and victory fanfare.
- **3D Arena:**
  - High perimeter pastel walls and dead tree.
  - Giant Young-hee Doll with animated head rotation, glowing sensor eyes, and scanning cones.
  - Four elevated sniper towers in the arena corners firing real-time tracer rounds.
  - Sand blood decals at elimination points and camera recoil shake.
  - VIP observation suite with the Front Man overlooking the arena.
  - Official Squid Game court markings (Circle, Triangle, Square) in the sand.
- **Contestant Cast:** Contestant #456 (Player) alongside 35+ named NPCs (#001 Oh Il-nam, #218 Sang-woo, #067 Sae-byeok, #199 Ali).
- **Survival Mechanics:**
  - 60-second countdown stadium timer.
  - Sprint Stamina meter (pacing your run).
  - Live alive counter (out of 456 players) and ₩45.6 Billion accumulating piggy bank.
- **Controls & Views:**
  - 3rd Person & 1st Person camera toggle (`V`).
  - Mobile virtual joystick support for touch devices.

## Controls

| Action | Key / Control |
|---|---|
| **Move** | `W`, `A`, `S`, `D` or `Arrow Keys` |
| **Sprint** | Hold `Shift` (consumes stamina) |
| **Toggle Camera** | `V` or Camera Button |
| **Toggle Audio** | Sound Button |

## Quick Start

You can run this project locally with any static web server:

```bash
# Using Python
python3 -m http.server 8080

# Using Node.js
npx serve -p 8080
```

Then open your browser at `http://localhost:8080`.
