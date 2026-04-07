# Score Popups — Implementation Spec

Paste this prompt into your implementation agent.

---

## Prompt

Add arcade-style score popups when enemies die. This merges into the **existing** `pickups.popups` floating text system in `js/weapons.js` — do NOT create a separate popup system.

Files to edit:
- `C:/Users/brian/Downloads/Anti gravity/Projects/TechnoDrone/js/enemies.js`
- `C:/Users/brian/Downloads/Anti gravity/Projects/TechnoDrone/js/weapons.js`

No other files should need changes.

---

## Architecture Decision: Merge Into Existing System

The game already has a floating text popup system at `pickups.popups` in `js/weapons.js`. It handles "OVERDRIVE +", "BASS PULSE READY", etc. — entries with `{ x, y, label, color, life }` that drift upward and fade.

Score popups reuse this same array. A new `isScore` flag on each entry lets the draw code apply different styling (smaller font, faster fade) without affecting existing pickup popups.

---

## Change 1: Spawn score popup on kill (enemies.js)

Find the `destroyShard()` function. After the existing `stage.onKill(s.isElite);` line, add the popup spawn:

```javascript
function destroyShard(s) {
  audio.play(s.isElite ? 'eliteDeath' : 'enemyDeath');
  fragments.burst(s.x, s.y, s.color, s.size, s.isElite);
  impactFX.onKill(s.x, s.y, s.color);
  smokeParticles.spawn(s.x, s.y, s.color);
  const idx = shards.pool.indexOf(s);
  if (idx >= 0) shards.pool.splice(idx, 1);
  stage.onKill(s.isElite);

  // === ADD THIS — Score popup ===
  const scoreVal = s.isElite ? 50 : 10;
  pickups.popups.push({
    x: s.x + (Math.random() - 0.5) * 12,
    y: s.y - 8,
    label: '+' + scoreVal,
    color: s.isElite ? '#ffcc00' : '#ffffff',
    life: s.isElite ? 700 : 550,
    isScore: true,
    elite: s.isElite
  });
}
```

Notes:
- Small random x-offset prevents stacking when multiple enemies die at the same spot
- `isScore: true` lets the draw code differentiate these from pickup text
- Score values (50/10) match `stage.onKill` logic — if those values ever change, update here too
- `elite` flag controls font size in draw

---

## Change 2: Score-specific draw styling (weapons.js)

Find the popup draw loop inside `pickups.draw()`. It currently looks like:

```javascript
this.popups.forEach(t => {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 18px monospace';
  ctx.globalAlpha = Math.min(1, t.life / 500);
  ctx.fillStyle = t.color;
  ctx.fillText(t.label, t.x, t.y);
  ctx.restore();
});
```

Replace with:

```javascript
this.popups.forEach(t => {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (t.isScore) {
    ctx.font = t.elite ? 'bold 16px monospace' : '13px monospace';
    ctx.globalAlpha = Math.min(1, t.life / 300) * 0.85;
  } else {
    ctx.font = 'bold 18px monospace';
    ctx.globalAlpha = Math.min(1, t.life / 500);
  }
  ctx.fillStyle = t.color;
  ctx.fillText(t.label, t.x, t.y);
  ctx.restore();
});
```

Styling rationale:
- **Basic kill**: `13px monospace` (not bold) — small, clean, secondary to gameplay
- **Elite kill**: `bold 16px monospace` — slightly larger and bolder, makes elite kills feel better
- **Faster fade**: divides by 300 instead of 500 — score popups disappear quicker than pickup popups
- **0.85 max alpha**: slightly transparent so they never compete with enemy/bullet visibility
- **No shadowBlur, no glow**: plain `fillText` only — performance is critical with up to 30 popups
- **Existing pickup popups unchanged**: the `else` branch preserves current behavior exactly

---

## Change 3: Cap popup count (weapons.js)

Find the popup update filter inside `pickups.update()`. It currently looks like:

```javascript
this.popups = this.popups.filter(t => {
  t.y -= 40 * dt;
  t.life -= delta;
  return t.life > 0;
});
```

Add a cap immediately after:

```javascript
this.popups = this.popups.filter(t => {
  t.y -= 40 * dt;
  t.life -= delta;
  return t.life > 0;
});

// Cap popups to prevent unbounded growth during nuke/swarm kills
while (this.popups.length > 30) {
  this.popups.shift();
}
```

This handles the nuke edge case (kills 24 enemies in one frame) without frame drops.

---

## What NOT To Do

- Do NOT create a separate `scorePopups` object or system — use `pickups.popups`
- Do NOT add `shadowBlur` or glow effects to score popups
- Do NOT add scale animation — just fade and drift
- Do NOT add horizontal wobble — pure vertical drift only
- Do NOT add combo text, chain counters, or medal systems
- Do NOT touch scoring logic — this is purely visual feedback

---

## Verification

1. Kill a basic enemy → white `+10` appears at death position, drifts up, fades in ~550ms
2. Kill an elite → yellow `+50` in bold, slightly larger, fades in ~700ms
3. Fire nuke in dense swarm → popups appear but cap at 30, no frame drop
4. Existing pickup popups ("OVERDRIVE +", "BASS PULSE READY") still render at 18px bold as before
5. Score popup values match the HUD score counter increases
