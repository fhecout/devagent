export function toBulletList(text) {
  if (!text?.trim()) return [];

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const items = [];

  for (const line of lines) {
    const cleaned = line
      .replace(/^[-*•]\s+/, '')
      .replace(/^\d+\.\s+/, '')
      .trim();
    if (cleaned) items.push(cleaned);
  }

  if (items.length <= 1 && text.length > 80) {
    return text
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10);
  }

  return items;
}

export function looksLikeCode(text) {
  if (!text) return false;
  return (
    /^(import |export |const |function |```|<\?php|package )/m.test(text) ||
    /código omitido/i.test(text) ||
    /aqui está o código/i.test(text)
  );
}
