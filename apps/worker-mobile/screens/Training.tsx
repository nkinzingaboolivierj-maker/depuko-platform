import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Button, FlatList, StyleSheet, Text, View } from "react-native";

const BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://depuko-api-production.up.railway.app/api/v1";

interface Course {
  id: string;
  title: string;
  summary: string;
  duration_minutes: number;
  enrollment_id: string | null;
  enrollment_status: "enrolled" | "in_progress" | "completed" | null;
  progress_percent: number | null;
}

export default function Training({ token }: { token: string }) {
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`${BASE}/training/courses`, { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.message ?? `failed (${res.status})`);
      setCourses(body.courses ?? []);
    } catch (e) {
      setError((e as Error).message);
      setCourses([]);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function enroll(courseId: string) {
    setBusyId(courseId);
    try {
      const res = await fetch(`${BASE}/training/courses/${courseId}/enroll`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.message ?? `failed (${res.status})`);
      await load();
    } catch (e) { Alert.alert("Enrollment failed", (e as Error).message); }
    finally { setBusyId(null); }
  }

  async function complete(enrollmentId: string) {
    setBusyId(enrollmentId);
    try {
      const res = await fetch(`${BASE}/training/enrollments/${enrollmentId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ progressPercent: 100 }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.message ?? `failed (${res.status})`);
      await load();
    } catch (e) { Alert.alert("Progress update failed", (e as Error).message); }
    finally { setBusyId(null); }
  }

  return (
    <View style={s.wrap}>
      <Text style={s.h}>Training</Text>
      {error && <Text style={s.error}>{error}</Text>}
      {courses === null ? <ActivityIndicator color="#06152A" /> : courses.length === 0 ? (
        <Text style={s.note}>No training courses have been published yet.</Text>
      ) : (
        <FlatList data={courses} keyExtractor={item => item.id} renderItem={({ item }) => (
          <View style={s.card}>
            <Text style={s.title}>{item.title}</Text>
            <Text style={s.note}>{item.summary}</Text>
            <Text style={s.note}>{item.duration_minutes} minutes</Text>
            {item.enrollment_status === "completed" ? <Text style={s.status}>Completed</Text> :
              item.enrollment_id ? (
                <View style={s.actions}>
                  <Text style={s.status}>{item.enrollment_status ?? "Enrolled"} · {item.progress_percent ?? 0}%</Text>
                  <Button title="Mark complete" color="#06152A" onPress={() => complete(item.enrollment_id!)} disabled={busyId === item.enrollment_id} />
                </View>
              ) : (
                <Button title="Enroll" color="#06152A" onPress={() => enroll(item.id)} disabled={busyId === item.id} />
              )}
          </View>
        )} />
      )}
      <Button title="Refresh courses" color="#06152A" onPress={load} />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 20, gap: 12, flex: 1 },
  h: { fontSize: 20, fontWeight: "700", color: "#06152A" },
  card: { padding: 14, borderWidth: 1, borderColor: "#dbe3ef", borderRadius: 10, backgroundColor: "#FFFFFF", gap: 8, marginBottom: 10 },
  title: { fontWeight: "700", fontSize: 16, color: "#06152A" },
  note: { color: "#64748b", fontSize: 13 },
  status: { color: "#06152A", fontWeight: "600" },
  actions: { gap: 8 },
  error: { color: "#06152A", fontSize: 13 },
});
