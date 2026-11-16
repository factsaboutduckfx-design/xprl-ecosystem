(() => {
  "use strict";
  const ENDPOINT = "wss://xrplcluster.com";
  const $ = (id) => document.getElementById(id);
  let socket;
  let requestId = 0;
  const pending = new Map();
  const setText = (id, value) => { const el = $(id); if (el) el.textContent = value; };
  function connect() {
    setText("connectionState", "Connecting");
    try { socket = new WebSocket(ENDPOINT); }
    catch (error) { setText("connectionState", "Unavailable"); setText("connectionDetail", error.message); return; }
    socket.addEventListener("open", () => {
      setText("connectionState", "Connected");
      setText("connectionDetail", "Public XRPL Mainnet WebSocket");
      socket.send(JSON.stringify({ id: ++requestId, command: "subscribe", streams: ["ledger"] }));
    });
    socket.addEventListener("message", (event) => {
      let data;
      try { data = JSON.parse(event.data); } catch { return; }
      if (data.id && pending.has(data.id)) {
        const item = pending.get(data.id);
        pending.delete(data.id);
        clearTimeout(item.timer);
        if (data.status === "error" || data.error) item.reject(new Error(data.error_message || data.error || "XRPL request failed"));
        else item.resolve(data);
      }
      const ledger = data.ledger || data.result?.ledger;
      if (ledger && (ledger.ledger_index || ledger.seqNum)) {
        setText("ledgerIndex", Number(ledger.ledger_index || ledger.seqNum).toLocaleString());
        setText("ledgerTime", ledger.ledger_time ? "Ledger time: " + ledger.ledger_time : "Latest validated ledger");
      }
    });
    socket.addEventListener("close", () => {
      setText("connectionState", "Disconnected");
      setText("connectionDetail", "Retrying connection…");
      setTimeout(connect, 5000);
    });
    socket.addEventListener("error", () => setText("connectionState", "Connection error"));
  }
  function rpc(command, params = {}) {
    return new Promise((resolve, reject) => {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        reject(new Error("Not connected to XRPL Mainnet. Wait a moment and retry."));
        return;
      }
      const id = ++requestId;
      const timer = setTimeout(() => { pending.delete(id); reject(new Error("XRPL request timed out.")); }, 15000);
      pending.set(id, { resolve, reject, timer });
      socket.send(JSON.stringify({ id, command, ...params }));
    });
  }
  function show(id, value) { const el = $(id); if (el) el.textContent = value; }
  $("accountForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const address = $("accountAddress").value.trim();
    show("accountResult", "Looking up public Mainnet account…");
    try {
      const response = await rpc("account_info", { account: address, ledger_index: "validated" });
      const data = response.account_data || response.result?.account_data;
      if (!data) throw new Error(response.error_message || response.error || "No account data returned.");
      const ledger = response.ledger_index || response.result?.ledger_index || "—";
      show("accountResult",
        "NETWORK: XRPL MAINNET\n" +
        "Address: " + data.Account + "\n" +
        "XRP balance: " + (Number(data.Balance) / 1000000).toLocaleString(undefined, { maximumFractionDigits: 6 }) + " XRP\n" +
        "Sequence: " + data.Sequence + "\n" +
        "Validated ledger: " + ledger + "\n" +
        "Explorer: https://xrpscan.com/account/" + data.Account);
    } catch (error) { show("accountResult", error.message); }
  });
  $("txForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const hash = $("txHash").value.trim();
    show("txResult", "Searching XRPL Mainnet validated history…");
    try {
      const response = await rpc("tx", { transaction: hash, binary: false });
      const tx = response.result || response;
      const meta = tx.meta || tx.metaData || {};
      const validated = tx.validated === true || Boolean(tx.ledger_index && meta.TransactionResult);
      const txHash = tx.hash || hash;
      show("txResult",
        "NETWORK: XRPL MAINNET\n" +
        "Status: " + (validated ? "VALIDATED ON-CHAIN" : "Validation not confirmed") + "\n" +
        "Hash: " + txHash + "\n" +
        "Type: " + (tx.TransactionType || "—") + "\n" +
        "Result: " + (meta.TransactionResult || "—") + "\n" +
        "Ledger: " + (tx.ledger_index || "—") + "\n" +
        "Fee: " + (tx.Fee ? (Number(tx.Fee) / 1000000) + " XRP" : "—") + "\n" +
        "Explorer: https://xrpscan.com/tx/" + txHash);
    } catch (error) { show("txResult", error.message); }
  });
  $("makePlan").addEventListener("click", () => {
    const plan = {
      name: $("tokenName").value.trim(),
      currency_code: $("tokenCode").value.trim().toUpperCase(),
      issuer_public_address: $("issuer").value.trim(),
      planned_supply: $("supply").value.trim(),
      network: "XRPL Mainnet",
      status: "Planning only — no transaction submitted"
    };
    show("tokenPlan", JSON.stringify(plan, null, 2));
  });
  connect();
})();