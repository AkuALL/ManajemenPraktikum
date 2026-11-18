import { Redirect } from 'expo-router';

/** @deprecated Sprint 1 fixture demo has been replaced by the Firestore-backed schedule. */
export default function AssistantActionsDemoScreen() {
  return <Redirect href="/schedule" />;
}
