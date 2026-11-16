(() => {
  "use strict";
  const ENDPOINT = "wss://xrplcluster.com";
  const $ = (id) => document.getElementById(id);
  let socket;
  let requestId = 0;
  let reconnectTimer;
  const pending = new Map();

  const setText = (id, value) => {
    const el = $(id);
    if (el) el.textContent = value;
  };
  const show = (id, value) => setText(id, value);
  const failPending = (message) => {
    for (const [id, item] of pending) {
      clearTimeout(item.timer);
      item.reject(new Error(message));
      pending.delete(id);
    }
  };

  function connect() {
    clearTimeout(reconnectTimer);
    setText("connectionState", "Connecting");
    setText("connectionDetail", ENDPOINT);
    try {
      socket = new WebSocket(ENDPOINT);
    } catch (error) {
      setText("connectionState", "Unavailable");
      setText("connectionDetail", error.message);
      reconnectTimer = setTimeout(connect, 5000);
      return;
    }

    socket.addEventListener("open", () => {
      setText("connectionState", "Connected");
      setText("connectionDetail", "Public XRPL Mainnet WebSocket");
      socket.send(JSON.stringify({
        id: ++requestId,
        command: "subscribe",
        streams: ["ledger"]
      }));
    });

    socket.addEventListener("message", (event) => {
      let data;
      try { data = JSON.parse(event.data); } catch { return; }

      if (data.id && pending.has(data.id)) {
        const item = pending.get(data.id);
        pending.delete(data.id);
        clearTimeout(item.timer);
        const result = data.result || data;
        if (data.status === "error" || data.error || result.error) {
          item.reject(new Error(data.error_message || result.error_message || result.error || "XRPL request failed"));
        } else {
          item.resolve(result);
        }
      }

      const ledger = data.ledger || data.result?.ledger;
      if (ledger && (ledger.ledger_index || ledger.seqNum)) {
        setText("ledgerIndex", Number(ledger.ledger_index || ledger.seqNum).toLocaleString());
        setText("ledgerTime", ledger.ledger_time ? "Ledger time: " + ledger.ledger_time : "Latest validated ledger");
      }
    });

    socket.addEventListener("close", () => {
      setText("connectionState", "Disconnected");
      setText("connectionDetail", "Reconnecting to public Mainnet…");
      failPending("Connection closed. Please retry after Mainnet reconnects.");
      reconnectTimer = setTimeout(connect, 5000);
    });

    socket.addEventListener("error", () => {
      setText("connectionState", "Connection error");
      setText("connectionDetail", "The public server may be unavailable or rate-limited.");
    });
  }

  function rpc(command, params = {}) {
    return new Promise((resolve, reject) => {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        reject(new Error("Not connected to XRPL Mainnet. Wait for the connection and retry."));
        return;
      }
      const id = ++requestId;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error("XRPL request timed out. Please retry."));
      }, 15000);
      pending.set(id, { resolve, reject, timer });
      socket.send(JSON.stringify({ id, command, ...params }));
    });
  }

  function isPublicAddress(value) {
    return /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(value);
  }

  $("accountForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const address = $("accountAddress").value.trim();
    if (!isPublicAddress(address)) {
      show("accountResult", "Enter a valid-looking public XRPL r-address. Never enter a seed or secret.");
      return;
    }
    show("accountResult", "Looking up the latest validated Mainnet ledger…");
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
        "Explorer: https://xrpscan.com/account/" + encodeURIComponent(data.Account));
    } catch (error) {
      show("accountResult", error.message);
    }
  });

  $("txForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const hash = $("txHash").value.trim().toUpperCase();
    if (!/^[A-F0-9]{64}$/.test(hash)) {
      show("txResult", "Enter a transaction hash containing exactly 64 hexadecimal characters.");
      return;
    }
    show("txResult", "Searching validated XRPL Mainnet transaction history…");
    try {
      const response = await rpc("tx", { transaction: hash, binary: false });
      const tx = response.tx_json || response;
      const meta = response.meta || tx.meta || response.metaData || tx.metaData || {};
      const validated = response.validated === true ||
        (Number.isInteger(response.ledger_index) && Boolean(meta.TransactionResult));
      const txHash = tx.hash || hash;
      show("txResult",
        "NETWORK: XRPL MAINNET\n" +
        "Status: " + (validated ? "VALIDATED ON-CHAIN" : "Validation not confirmed") + "\n" +
        "Hash: " + txHash + "\n" +
        "Type: " + (tx.TransactionType || "—") + "\n" +
        "Result: " + (meta.TransactionResult || "—") + "\n" +
        "Ledger: " + (response.ledger_index || "—") + "\n" +
        "Fee: " + (tx.Fee ? (Number(tx.Fee) / 1000000) + " XRP" : "—") + "\n" +
        "Explorer: https://xrpscan.com/tx/" + encodeURIComponent(txHash));
    } catch (error) {
      show("txResult", error.message);
    }
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
