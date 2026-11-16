(() => {
  const ENDPOINT = "wss://xrplcluster.com";
  const $ = (id) => document.getElementById(id);
  let socket, requestId = 0;
  const pending = new Map();
  const setText = (id, value) => { const el = $(id); if (el) el.textContent = value; };
  function connect() {
    setText("connectionState", "Connecting");
    try { socket = new WebSocket(ENDPOINT); } catch (e) { setText("connectionState", "Unavailable"); setText("connectionDetail", e.message); return; }
    socket.addEventListener("open", () => {
      setText("connectionState", "Connected");
      setText("connectionDetail", "Public Mainnet WebSocket");
      socket.send(JSON.stringify({id:++requestId,command:"subscribe",streams:["ledger"]}));
    });
    socket.addEventListener("message", (event) => {
      let data; try { data = JSON.parse(event.data); } catch { return; }
      if (data.id && pending.has(data.id)) { const p = pending.get(data.id); pending.delete(data.id); clearTimeout(p.timer); data.status === "error" ? p.reject(new Error(data.error_message || data.error || "XRPL request failed")) : p.resolve(data); }
      const ledger = data.ledger || data.result?.ledger;
      if (ledger && (ledger.ledger_index || ledger.seqNum)) {
        setText("ledgerIndex", Number(ledger.ledger_index || ledger.seqNum).toLocaleString());
        setText("ledgerTime", ledger.ledger_time ? "Ledger time: " + ledger.ledger_time : "Latest validated ledger");
      }
    });
    socket.addEventListener("close", () => { setText("connectionState", "Disconnected"); setText("connectionDetail", "Retrying connection…"); setTimeout(connect, 5000); });
    socket.addEventListener("error", () => { setText("connectionState", "Connection error"); });
  }
  function rpc(command, params = {}) {
    return new Promise((resolve, reject) => {
      if (!socket || socket.readyState !== WebSocket.OPEN) return reject(new Error("Not connected to XRPL Mainnet. Wait a moment and retry."));
      const id = ++requestId, timer = setTimeout(() => { pending.delete(id); reject(new Error("XRPL request timed out.")); }, 12000);
      pending.set(id, {resolve,reject,timer});
      socket.send(JSON.stringify({id,command,...params}));
    });
  }
  function show(id, value) { const el=$(id); el.textContent=value; }
  $("accountForm").addEventListener("submit", async (e) => {
    e.preventDefault(); const address=$("accountAddress").value.trim(); show("accountResult","Looking up public account…");
    try {
      const r=await rpc("account_info",{account:address,ledger_index:"validated"});
      const a=r.account_data || r.result?.account_data;
      if (!a) throw new Error("No account data returned.");
      show("accountResult", "Address: "+a.Account+"
XRP balance: "+(Number(a.Balance)/1_000_000).toLocaleString(undefined,{maximumFractionDigits:6})+" XRP
Sequence: "+a.Sequence+"
Validated ledger: "+(r.ledger_index || r.result?.ledger_index || "—"));
    } catch(err) { show("accountResult",err.message); }
  });
  $("txForm").addEventListener("submit", async (e) => {
    e.preventDefault(); const hash=$("txHash").value.trim(); show("txResult","Searching validated ledger…");
    try {
      const r=await rpc("tx",{transaction:hash, binary:false});
      const t=r.result || r;
      show("txResult","Hash: "+(t.hash || hash)+"
Type: "+(t.TransactionType || "—")+"
Result: "+(t.meta?.TransactionResult || t.metaData?.TransactionResult || "—")+"
Ledger: "+(t.ledger_index || "—")+"
Fee: "+(t.Fee ? (Number(t.Fee)/1_000_000)+" XRP" : "—"));
    } catch(err) { show("txResult",err.message); }
  });
  $("makePlan").addEventListener("click", () => {
    const plan={name:$("tokenName").value.trim(),currency_code:$("tokenCode").value.trim().toUpperCase(),issuer_public_address:$("issuer").value.trim(),planned_supply:$("supply").value.trim(),network:"XRPL Testnet",status:"Planning only — not issued"};
    show("tokenPlan",JSON.stringify(plan,null,2));
  });
  connect();
})();