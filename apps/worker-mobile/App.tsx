import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Button, FlatList, StyleSheet, Text, TextInput, View, ScrollView } from "react-native";
import Profile from "./screens/Profile";
import Safety from "./screens/Safety";
import Opportunities from "./screens/Opportunities";
import Earnings from "./screens/Earnings";
import Training from "./screens/Training";
import Support from "./screens/Support";

const BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";
type Screen = "assignments" | "profile" | "safety" | "opportunities" | "earnings" | "training" | "support";

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [assignments, setAssignments] = useState<{ id: string; status: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [screen, setScreen] = useState<Screen>("assignments");

  async function login() {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/auth/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.message ?? "login failed");
      const sessionToken = body.sessionToken ?? body.token;
      if (!sessionToken) throw new Error("server did not return a session token");
      setToken(sessionToken);
    } catch (e) { Alert.alert("Sign in failed", (e as Error).message); }
    finally { setLoading(false); }
  }

  async function loadAssignments() {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/assignments/mine`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`failed (${res.status})`);
      setAssignments((await res.json()).assignments);
    } catch (e) { Alert.alert("Could not load assignments", (e as Error).message); }
    finally { setLoading(false); }
  }

  async function act(id: string, command: string) {
    try {
      const res = await fetch(`${BASE}/assignments/${id}/${command}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`failed (${res.status})`);
      await loadAssignments();
    } catch (e) { Alert.alert("Action failed", (e as Error).message); }
  }

  useEffect(() => { if (token) loadAssignments(); }, [token]);

  if (!token) return (
    <View style={s.center}>
      <Text style={s.h}>DEPUKO Worker</Text>
      <TextInput style={s.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <TextInput style={s.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
      {loading ? <ActivityIndicator /> : <Button title="Sign in" color="#06152A" onPress={login} disabled={!email || !password} />}
      <Text style={s.note}>Use your registered worker account. A verified worker profile is required for opportunities.</Text>
    </View>
  );

  return (
    <View style={s.wrap}>
      <Text style={s.h}>DEPUKO Worker</Text>
      <ScrollView horizontal style={s.tabs} contentContainerStyle={{ gap: 8 }}>
        {(["assignments","profile","safety","opportunities","earnings","training","support"] as Screen[]).map(item =>
          <Button key={item} color={screen===item?"#06152A":"#718096"} title={item[0].toUpperCase()+item.slice(1)} onPress={() => setScreen(item)} />)}
      </ScrollView>
      {screen === "assignments" && <View style={{ flex: 1 }}>
        <Text style={s.sub}>My assignments</Text>
        {loading && <ActivityIndicator />}
        <FlatList data={assignments} keyExtractor={a => a.id} renderItem={({ item }) => (
          <View style={s.row}>
            <View style={{ flex: 1 }}><Text>{item.id}</Text><Text>{item.status}</Text></View>
            {item.status === "offered" && <Button title="Accept" color="#06152A" onPress={() => act(item.id, "accept")} />}
            {item.status === "accepted" && <Button title="Check in" color="#06152A" onPress={() => act(item.id, "check-in")} />}
            {item.status === "checked_in" && <Button title="Check out" color="#06152A" onPress={() => act(item.id, "check-out")} />}
          </View>
        )} />
        <Button title="Refresh" color="#06152A" onPress={loadAssignments} />
      </View>}
      {screen === "profile" && <Profile token={token} />}
      {screen === "safety" && <Safety token={token} />}
      {screen === "opportunities" && <Opportunities token={token} />}
      {screen === "earnings" && <Earnings token={token} />}
      {screen === "training" && <Training token={token} />}
      {screen === "support" && <Support token={token} />}
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12, backgroundColor: "#F5F7FA" },
  wrap: { flex: 1, paddingTop: 48, paddingHorizontal: 16, backgroundColor: "#F5F7FA" },
  h: { fontSize: 26, fontWeight: "800", color: "#06152A", marginBottom: 10 },
  sub: { fontSize: 18, fontWeight: "600", marginVertical: 8 },
  tabs: { maxHeight: 44, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: "#d7e0eb", padding: 13, width: 280, borderRadius: 10, backgroundColor: "#fff", marginVertical: 5 },
  note: { color: "#64748b", marginTop: 12, textAlign: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#e2e8f0", backgroundColor: "#fff", borderRadius: 10, paddingHorizontal: 12 },
});
