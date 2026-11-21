const rankingEnabled = false;

const firebaseConfig = {
  apiKey: "AIzaSyC_pFjqjfzpxexW9t4swhaNJoXZOlDeDbc",
  authDomain: "castor-kanji-quest-8def2.firebaseapp.com",
  projectId: "castor-kanji-quest-8def2",
  storageBucket: "castor-kanji-quest-8def2.firebasestorage.app",
  messagingSenderId: "314149178071",
  appId: "1:314149178071:web:17ff623bf02b5f59babe92",
};

function timed(promise, milliseconds = 12000) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("通信がタイムアウトしました")), milliseconds);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function validateResult(result) {
  if (!/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(result.period)
    || typeof result.name !== "string" || !result.name.trim() || Array.from(result.name).length > 8
    || !Number.isInteger(result.served) || result.served < 1 || result.served > 62
    || !Number.isInteger(result.correct) || result.correct < result.served * 3 || result.correct > 100000
    || !Number.isInteger(result.misses) || result.misses < 0 || result.misses > 100000
    || result.elapsedMs !== 180000 || typeof result.id !== "string" || result.id.length > 64) {
    throw new Error("記録の形式が正しくありません");
  }
  const accuracy = Math.round(result.correct / (result.correct + result.misses) * 10000);
  return {
    name: result.name.trim(), served: result.served, correct: result.correct,
    misses: result.misses, elapsedMs: 180000, roundId: result.id,
    accuracy, score: result.served * 10001 + accuracy,
  };
}

let clientPromise;
async function client() {
  if (!rankingEnabled) throw new Error("準備中");
  if (!clientPromise) {
    clientPromise = Promise.all([
      import("https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js"),
      import("https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js"),
    ]).then(async ([appModule, authModule, db]) => {
      const app = appModule.getApps().find(app => app.name === "typing-kitchen")
        || appModule.initializeApp(firebaseConfig, "typing-kitchen");
      const auth = authModule.getAuth(app);
      const user = auth.currentUser || (await authModule.signInAnonymously(auth)).user;
      return {db, store: db.getFirestore(app), user};
    }).catch(error => {
      clientPromise = null;
      throw error;
    });
  }
  return timed(clientPromise);
}

async function load(period) {
  if (!/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(period)) throw new Error("月の形式が正しくありません");
  const {db, store, user} = await client();
  const entries = db.collection(store, "kitchenRankings", period, "entries");
  const snapshot = await timed(db.getDocs(db.query(entries, db.orderBy("score", "desc"), db.limit(50))));
  return {uid: user.uid, entries: snapshot.docs.map(doc => doc.data())};
}

async function submit(result) {
  const entry = validateResult(result);
  const {db, store, user} = await client();
  const ref = db.doc(store, "kitchenRankings", result.period, "entries", user.uid);
  return timed(db.runTransaction(store, async transaction => {
    const current = await transaction.get(ref);
    if (!current.exists() || entry.score > current.data().score) {
      transaction.set(ref, {...entry, uid: user.uid, achievedAt: db.serverTimestamp(), updatedAt: db.serverTimestamp()});
      return "saved";
    }
    if (current.data().name !== entry.name) {
      transaction.update(ref, {name: entry.name, updatedAt: db.serverTimestamp()});
    }
    return "kept";
  }), 20000);
}

window.kitchenRankingReady = Promise.resolve({load, submit});
