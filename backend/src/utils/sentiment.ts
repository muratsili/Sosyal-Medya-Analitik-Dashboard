const positiveWords = ['harika', 'güzel', 'muhteşem', 'iyi', 'başarılı', 'love', 'great', 'awesome', 'good'];
const negativeWords = ['kötü', 'berbat', 'rezalet', 'başarısız', 'hate', 'bad', 'awful', 'terrible'];

export function analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
  const words = text.toLowerCase().split(/\s+/);
  let score = 0;

  words.forEach(word => {
    if (positiveWords.includes(word)) score++;
    if (negativeWords.includes(word)) score--;
  });

  if (score > 0) return 'positive';
  if (score < 0) return 'negative';
  return 'neutral';
}
