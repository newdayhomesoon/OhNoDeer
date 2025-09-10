import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_RESPONSES_KEY = '@OhNoDeer:user_responses';

export interface ResponseData {
  userId?: string;
  timestamp: string;
  question: string;
  response: string;
}

export async function saveResponse(
  userId: string | undefined,
  question: string,
  response: string,
): Promise<void> {
  const timestamp = new Date().toISOString();
  const data: ResponseData = {userId, timestamp, question, response};
  const line = JSON.stringify(data) + '\n';

  try {
    const existing = (await AsyncStorage.getItem(USER_RESPONSES_KEY)) || '';
    await AsyncStorage.setItem(USER_RESPONSES_KEY, existing + line);
  } catch (error) {
    // Fail silently
  }
}

export async function getStatistics(): Promise<Record<string, number>> {
  try {
    const content = (await AsyncStorage.getItem(USER_RESPONSES_KEY)) || '';
    const lines = content
      .trim()
      .split('\n')
      .filter(line => line);
    const stats: Record<string, number> = {};

    lines.forEach(line => {
      try {
        const data: ResponseData = JSON.parse(line);
        const key = `${data.question}:${data.response}`;
        stats[key] = (stats[key] || 0) + 1;
      } catch {
        // ignore malformed lines
      }
    });
    return stats;
  } catch (error) {
    return {};
  }
}
