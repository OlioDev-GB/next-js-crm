/* Olio Group - Generate Client Proposal (SOW button widget) */
(function () {
  'use strict';
  var P = window.OlioProposal;
  var SOW = 'Deals', BIDS = 'Bids';
  var JIM_ID = '2168928000000893001';           // Jim Bjorgaard approves margins under 10%
  var AI_FUNCTION = 'read_vendor_proposal';      // Gabriel's document reader, exposed as a CRM function
  var SECTIONS = ['Work_Methods', 'Staffing_and_QC', 'Safety', 'Schedule', 'Clarifications', 'Exclusions'];

  var state = { id: null, sow: null, bids: [], bidDetail: {}, bidId: null, sowRows: [], items: [], user: null, contact: null, aiTotal: null, readerNotes: [], busy: false, dirty: false, marginTouched: false,
    rowMode: true, rateSchedule: false, winter: false, hasSowRates: false };
  var VERSION = 16;
  var VALID_DAYS = 30;   // matches the 'valid for 30 days' clarification
  var TARGET_MIN = 15;   // standard target minimum margin: 10% to 15% gets a review warning
  var $ = function (id) { return document.getElementById(id); };

  // ------------------------------------------------------------ helpers
  function setStatus(t) { $('status').textContent = t || ''; }
  function msg(kind, text) { var d = document.createElement('div'); d.className = 'msg ' + kind; d.textContent = text; $('msgs').appendChild(d); }
  function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(/[$,\s]/g, '')); return isNaN(n) ? 0 : n; }
  function r2(v) { return Math.round((v + Number.EPSILON) * 100) / 100; }
  function r1(v) { return Math.round(v * 10) / 10; }
  function todayISO() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function apiData(resp) { return resp && resp.data ? resp.data : []; }
  function check(resp, what) {
    var d = resp && resp.data && resp.data[0];
    if (d && d.code && d.code !== 'SUCCESS') throw new Error(what + ': ' + (d.message || d.code) + (d.details ? ' ' + JSON.stringify(d.details) : ''));
    return resp;
  }
  function errText(e) { return (e && (e.message || (e.data && e.data[0] && e.data[0].message))) || JSON.stringify(e); }
  function isJim() { return state.user && state.user.id === JIM_ID; }
  function busy(on, text) {
    state.busy = on; setStatus(text || '');
    ['saveBtn', 'previewBtn', 'generateBtn', 'addRow', 'fromSow', 'requestBtn', 'approveBtn', 'aiBtn', 'bidSel'].forEach(function (id) { if ($(id)) $(id).disabled = on; });
    if (!on) refresh();
  }

  // ------------------------------------------------------------ pricing model
  function marginInput() { var m = parseFloat($('margin').value); return isNaN(m) ? P.MARGIN_DEFAULT : m; }
  function rateFor(vp, m) { return r2(num(vp) / (1 - m / 100)); }
  // Price a SOW row at margin m. A row with no vendor price keeps the client rate already on the SOW (if any)
  // instead of dropping to $0; Generate stays locked until the vendor price is filled in.
  function priceRow(r, m) { r.rate = num(r.vp) > 0 ? rateFor(r.vp, m) : (num(r.sowRate) > 0 ? num(r.sowRate) : 0); }
  // Winter tiers: Number of Services holds tier quantities, not service counts, so it is never used to weight anything.
  function isWinterRow(r) { return r.cat === 'W'; }
  // Number of Services on a row (blank or 0 counts as 1). OTS item mode and winter tiers always count once.
  function qty(r) { return (state.rowMode && !isWinterRow(r)) ? Math.max(1, num(r.n)) : 1; }
  function totals() {
    var v = 0, c = 0;
    state.sowRows.forEach(function (r) { v = r2(v + num(r.vp) * qty(r)); c = r2(c + num(r.rate) * qty(r)); });
    return { vendor: v, client: c, profit: r2(c - v), margin: c > 0 ? r1((c - v) / c * 100) : 0 };
  }
  // Included rows (Sierra, 10/30): on a multi-row SOW, a row with no vendor price AND no client rate is covered by
  // another priced line (e.g. "Monthly Inclusive" packages priced on the first row). It prints as "Included" and does
  // not lock Generate. A row with a client rate but no vendor price still locks Generate.
  function isIncluded(r) {
    return state.rowMode && !(num(r.vp) > 0) && !(num(r.rate) > 0) &&
      state.sowRows.some(function (x) { return x !== r && num(x.vp) > 0 && num(x.rate) > 0; });
  }
  function rowMargin(r) { return num(r.rate) > 0 ? r1((num(r.rate) - num(r.vp)) / num(r.rate) * 100) : null; }
  function linesUnder(floor) { return state.sowRows.filter(function (r) { return num(r.rate) > 0 && num(r.vp) > 0 && rowMargin(r) < floor; }); }
  // Approval is judged on the whole contract: the blended margin across every priced row
  // (weighted by Number of Services; winter counts one of each tier since volumes are unknown).
  // Rows missing a vendor price or client rate are left out (they already lock Generate).
  function pricedRows() { return state.sowRows.filter(function (r) { return num(r.rate) > 0 && num(r.vp) > 0; }); }
  function blendedMargin() {
    var v = 0, c = 0;
    pricedRows().forEach(function (r) { v = r2(v + num(r.vp) * qty(r)); c = r2(c + num(r.rate) * qty(r)); });
    return c > 0 ? r1((c - v) / c * 100) : null;
  }
  function needsApproval() { var b = blendedMargin(); return b != null && b < P.MARGIN_FLOOR_WITHOUT_APPROVAL; }
  // Approval key: a fingerprint of the exact vendor price and client rate on every row. Jim's approval stores it in
  // Proposal_Approved_Pricing (read-only for Sales profiles); any pricing change no longer matches it.
  function fnv(str, seed) { var h = seed >>> 0; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return ('0000000' + h.toString(16)).slice(-8); }
  function approvalKey() {
    var sig = state.id + '|' + state.sowRows.map(function (r) { return r.id + ':' + r2(num(r.vp)).toFixed(2) + ':' + r2(num(r.rate)).toFixed(2); }).join('|');
    return 'v1-' + fnv(sig, 2166136261) + fnv(sig, 3735928559);
  }
  function approved() {
    return state.sow.Proposal_Margin_Approval === 'Approved by Jim' && !!state.sow.Proposal_Approved_Pricing && state.sow.Proposal_Approved_Pricing === approvalKey();
  }
  function pendingRequest() { return !!state.draft.requestedKey && state.draft.requestedKey === approvalKey(); }

  // ------------------------------------------------------------ load
  function load() {
    return Promise.all([
      ZOHO.CRM.API.getRecord({ Entity: SOW, RecordID: state.id }),
      ZOHO.CRM.API.getRelatedRecords({ Entity: SOW, RecordID: state.id, RelatedList: 'Bids', page: 1, per_page: 50 }),
      ZOHO.CRM.CONFIG.getCurrentUser()
    ]).then(function (r) {
      state.sow = apiData(r[0])[0];
      state.bids = apiData(r[1]);
      state.user = r[2] && r[2].users && r[2].users[0];
      var draft = {};
      try { draft = state.sow.Proposal_Draft_Data ? JSON.parse(state.sow.Proposal_Draft_Data) : {}; } catch (e) { draft = {}; }
      state.draft = draft;
      // which bid
      var sel = state.bids.filter(function (b) { return b.Selected_Bid; })[0];
      state.bidId = (draft.bidId && state.bids.some(function (b) { return b.id === draft.bidId; })) ? draft.bidId : (sel ? sel.id : null);
      return Promise.all(state.bids.map(function (b) {
        return ZOHO.CRM.API.getRecord({ Entity: BIDS, RecordID: b.id }).then(function (x) { state.bidDetail[b.id] = apiData(x)[0]; });
      }));
    }).then(function () {
      var uid = (state.sow.Sales_Associate_New && state.sow.Sales_Associate_New.id) || (state.sow.Sales_Owner && state.sow.Sales_Owner.id);
      return uid ? ZOHO.CRM.API.getUser({ ID: uid }).then(function (u) {
        var x = u && u.users && u.users[0]; state.contact = x ? { name: x.full_name, email: x.email } : null;
      }).catch(function () { state.contact = null; }) : null;
    }).then(function () {
      buildRows();
      fillText();
      renderBidSelect(); renderSowRows(); renderItems(); refresh();
      var s = state.sow;
      renderLastProp();
      $('title').textContent = [s.Deal_Name, s.Account_Name && s.Account_Name.name, [s.Site_City, s.Site_State].filter(Boolean).join(', ')].filter(Boolean).join('  |  ');
    });
  }

  function bidRowsFor(bidId) {
    var b = bidId && state.bidDetail[bidId];
    return (b && b.Scope_of_Work_Details) || [];
  }
  function bidTotal(bidId) { return r2(bidRowsFor(bidId).reduce(function (s, r) { return s + num(r.Vendor_Price); }, 0)); }

  // SOW Scope of Work rows: vendor price from the chosen bid (matched by service), else the SOW row.
  function buildRows() {
    var s = state.sow, brows = bidRowsFor(state.bidId);
    var rows = (s.Scope_of_Work || []).map(function (r) {
      var svcId = r.OurServices && r.OurServices.id;
      var match = brows.filter(function (b) { return b.OurServices && b.OurServices.id === svcId; })[0];
      var vp = match && match.Vendor_Price != null ? num(match.Vendor_Price) : num(r.Vendor_Price);
      return { id: r.id, svcId: svcId, svc: (r.OurServices && r.OurServices.name) || 'Service', cat: r.Category || '', n: r.Number_of_Services, vp: vp, sowVp: r.Vendor_Price, rate: r.Invoice_Price == null || r.Invoice_Price === '' ? null : num(r.Invoice_Price), desc: r.Description || '' };
    });
    // Mode. One-time (OTS) SOW with a single row: the client sees the vendor's itemized scope rolled up to that row.
    // Anything else (recurring, seasonal, several rows): the proposal lists exactly the SOW rows.
    // Recurring / seasonal SOWs print as a rate schedule with no grand total.
    var isOTS = s.Is_OTS_SOW === true || (rows.length > 0 && rows.every(function (r) { return r.cat === 'OTS' || /^OTS\b/i.test(r.svc); }));
    state.rowMode = !(isOTS && rows.length === 1);
    state.rateSchedule = !isOTS;
    state.winter = state.rateSchedule && rows.some(isWinterRow);
    // Opening prices (Jim, 10/29):
    //  1. A saved draft with proposed rates reopens exactly as the rep left it.
    //  2. An SOW that already has client rates opens AT those rates, showing their current margin. Repricing is a
    //     deliberate step (Apply to all rows), and Generate still confirms every rate that would change.
    //  3. Blank pricing opens at the 20% default. Blank rows on a partly priced SOW are also priced at 20%.
    var dr = state.draft.rates || null, hasDraftRates = !!dr && Object.keys(dr).some(function (k) { return num(dr[k]) > 0; });
    rows.forEach(function (r) { r.sowRate = r.rate; });
    state.hasSowRates = rows.some(function (r) { return num(r.sowRate) > 0; });
    state.sowRows = rows;
    var m = P.MARGIN_DEFAULT;
    if (hasDraftRates) {
      m = state.draft.m != null && state.draft.m !== '' ? num(state.draft.m) : P.MARGIN_DEFAULT;
      rows.forEach(function (r) { priceRow(r, m); if (dr[r.id] != null && num(dr[r.id]) > 0) r.rate = num(dr[r.id]); });
    } else if (state.hasSowRates) {
      rows.forEach(function (r) { if (num(r.sowRate) > 0) r.rate = num(r.sowRate); else priceRow(r, P.MARGIN_DEFAULT); });
      m = currentMargin();
    } else {
      if (state.draft.m != null && state.draft.m !== '') m = num(state.draft.m);
      rows.forEach(function (r) { priceRow(r, m); });
    }
    $('margin').value = m;
    // proposal items: SOW rows (row mode), else the saved draft, else one item per SOW row
    if (state.rowMode) itemsFromSow();
    else if (state.draft.items && state.draft.items.length) { state.itemsAreDefault = false; state.itemsBid = state.draft.itemsBid || state.draft.bidId || null; state.items = state.draft.items.map(function (i) { return Object.assign({}, i); }); }
    else itemsFromSow();
    state.aiTotal = state.draft.aiTotal != null ? state.draft.aiTotal : null;
  }
  function itemsFromSow() {
    state.itemsAreDefault = true; state.itemsBid = null;
    // In row mode, keep any name / area / description edits saved in the draft for the same SOW row.
    var saved = {};
    if (state.rowMode) (state.draft.items || []).forEach(function (i) { if (i.rowId) saved[i.rowId] = i; });
    state.items = state.sowRows.map(function (r) {
      var k = saved[r.id] || {};
      return { rowId: r.id, Name: k.Name || String(r.svc).replace(/^OTS\s+/i, ''), Area: k.Area || '', Description: k.Description != null ? k.Description : (r.desc || ''), Vendor_Cost: r.vp };
    });
  }
  // Margin implied by the rates on screen (winter: unweighted, one of each tier).
  function currentMargin() { return totals().margin; }
  function fmtWhen(iso) {
    var d = new Date(iso); if (isNaN(d)) return '';
    var mo = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
    var h = d.getHours(), ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
    return mo + ' ' + d.getDate() + ', ' + h + ':' + String(d.getMinutes()).padStart(2, '0') + ' ' + ap;
  }
  function renderLastProp() {
    var s = state.sow, el = $('lastProp');
    if (!s || !s.Last_Proposal_Generated) { el.innerHTML = 'No proposal generated yet'; return; }
    var by = state.draft.genBy ? ', ' + esc(state.draft.genBy) : '';
    el.innerHTML = 'Last proposal: <b>Rev ' + (num(s.Proposal_Revision) || 1) + '</b><br>' + esc(fmtWhen(s.Last_Proposal_Generated)) + by;
  }
  function rowById(id) { return state.sowRows.filter(function (r) { return r.id === id; })[0]; }

  // A bid with no vendor document attached gives AI Bid Reader nothing to read (common on monthly-inclusive and
  // re-sign SOWs). On SOWs priced row by row, treat it like the no-bid case and draft the text from the SOW.
  function bidHasDoc(id) {
    var b = id && state.bidDetail[id]; if (!b) return false;
    return ['Bid_Docs_URL', 'Bid_Docs_Upload', 'Supporting_Docs_URL', 'Supporting_Doc_Upload', 'URL'].some(function (k) {
      var v = b[k]; return Array.isArray(v) ? v.length > 0 : !!(v && String(v).trim());
    });
  }
  function draftFromSow() { return !state.bids.length || (state.rowMode && !bidHasDoc(state.bidId)); }
  function fillText() {
    var s = state.sow, d = state.draft;
    $('t_title').value = d.title || (draftFromSow() && sowTitleDraft()) || s.Deal_Name || '';
    $('t_scope').value = d.scopeRef || '';
    var loc = [s.Site_Street, s.Site_City, [s.Site_State, s.Site_Zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    $('t_loc').value = d.location || loc;
    $('t_client').value = d.client || (s.Account_Name && s.Account_Name.name) || '';
    state.summaryFromSow = false;
    if (d.summary) $('t_summary').value = d.summary;
    else if (draftFromSow()) { $('t_summary').value = sowSummaryDraft(); state.summaryFromSow = true; }
    else $('t_summary').value = '';
    SECTIONS.forEach(function (k) { $('t_' + k).value = (d.sections && d.sections[k]) || P.STANDARD_TEXT[k]; });
  }

  // No bid on the SOW (re-signs, carried-over pricing): draft a starter Project Summary from the SOW itself,
  // so the rep only reviews it. Plain facts from SOW fields; nothing invented.
  function longDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); if (!m) return '';
    return ['January','February','March','April','May','June','July','August','September','October','November','December'][+m[2] - 1] + ' ' + (+m[3]) + ', ' + m[1];
  }
  function joinAnd(a) { return a.length < 2 ? (a[0] || '') : a.slice(0, -1).join(', ') + (a.length > 2 ? ',' : '') + ' and ' + a[a.length - 1]; }
  function sowServiceNames() {
    var seen = {}, out = [];
    state.sowRows.forEach(function (r) {
      var n = String(r.svc || '').replace(/^OTS\s+/i, '').replace(/\s*\(.*?\)\s*/g, ' ').replace(/\s+\d.*$/, '').trim();
      if (n && !seen[n.toLowerCase()]) { seen[n.toLowerCase()] = 1; out.push(n); }
    });
    return out;
  }
  function sowTitleDraft() {
    var n = sowServiceNames(); if (!n.length) return '';
    var t = joinAnd(n); return /(services?|work)$/i.test(t) ? t : t + ' Services';
  }
  function sowSummaryDraft() {
    var s = state.sow, svcs = sowServiceNames().map(function (n) { return n.toLowerCase(); });
    if (!svcs.length) return '';
    var place = s.Location_Name || (s.Account_Name && s.Account_Name.name) || 'the site';
    var addr = [s.Site_Street, s.Site_City, [s.Site_State, s.Site_Zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    var start = longDate(s.Start_Date), end = longDate(s.End_Date);
    var what = joinAnd(svcs) + (/(services?|work)$/.test(svcs[svcs.length - 1]) ? '' : ' services');
    var out = 'Olio Group will provide ' + what + ' at ' + place + (addr ? ' (' + addr + ')' : '');
    if (start && end) out += state.winter ? ' for the ' + start + ' to ' + end + ' season' : ' from ' + start + ' to ' + end;
    out += '.';
    if (state.winter) {
      var t = String(s.Trigger_Point || '').trim(), areas = String(s.Snow_Removal_Salt_Area_Inclusions || '').trim().toLowerCase();
      if (t || areas) out += ' Plowing ' + (t ? 'begins at a ' + t + ' inch trigger' : 'is provided') + (areas ? ' and covers ' + areas : '') + '.';
      var salt = String(s.Salt_Billing_Frequency_and_Type || '').trim();
      if (salt && svcs.some(function (x) { return /salt/.test(x); })) out += ' Salt is ' + salt.charAt(0).toLowerCase() + salt.slice(1).replace(/,\s*billed/i, ' and billed').toLowerCase() + '.';
      out += ' Each service is billed per event at the rates below.';
    }
    if (/renew/i.test(s.Contract_Term || '') || s.Renewal_Type) out += ' This proposal renews our current service agreement for this site.';
    return out;
  }

  // ------------------------------------------------------------ render
  function renderBidSelect() {
    var sel = $('bidSel'); sel.innerHTML = '';
    if (!state.bids.length) { sel.innerHTML = '<option value="">No bids on this SOW (using SOW prices)</option>'; return; }
    if (!state.bidId) sel.innerHTML = '<option value="">Choose a bid...</option>';
    state.bids.forEach(function (b) {
      var o = document.createElement('option'); o.value = b.id;
      o.textContent = 'Bid ' + (b.Name || b.Bid_ID || '') + ' | ' + ((b.Vendor && b.Vendor.name) || 'No vendor') + ' | ' + P.money(bidTotal(b.id)) + (b.Selected_Bid ? ' (Selected)' : '');
      sel.appendChild(o);
    });
    sel.value = state.bidId || '';
  }

  function renderSowRows() {
    var tb = $('sowRows'); tb.innerHTML = '';
    if (!state.sowRows.length) { tb.innerHTML = '<tr><td colspan="4" class="plain">This SOW has no Scope of Work rows. Add the service line on the SOW first.</td></tr>'; return; }
    state.sowRows.forEach(function (r) {
      var tr = document.createElement('tr');
      tr.innerHTML = '<td class="plain">' + esc(r.svc) + '</td><td class="num plain">' + P.money(r.vp) + '</td>' +
        '<td class="rate num"><div class="money"><span>$</span><input inputmode="decimal" title="Type the client rate you want; the margin updates" value="' + (num(r.rate) > 0 || num(r.vp) > 0 ? num(r.rate).toFixed(2) : '') + '"' + (num(r.vp) > 0 ? '' : ' placeholder="Included"') + '></div></td><td class="num plain" data-m></td>';
      var inp = tr.querySelector('input');
      // Manual client rate (e.g. a round number): the row margin and the Margin % box follow the rates on screen.
      inp.addEventListener('input', function (e) {
        r.rate = num(e.target.value); state.dirty = true; state.marginPending = false;
        $('margin').value = currentMargin(); refresh();
      });
      inp.addEventListener('blur', function (e) { if (num(e.target.value) > 0) e.target.value = r2(num(e.target.value)).toFixed(2); });
      tb.appendChild(tr);
    });
  }

  function renderItems() {
    var tb = $('rows'); tb.innerHTML = '';
    var rm = state.rowMode;
    Array.prototype.forEach.call(document.querySelectorAll('th.pricecol'), function (th) { th.style.display = rm ? 'none' : ''; });
    $('addRow').style.display = rm ? 'none' : '';
    $('fromSow').style.display = rm ? 'none' : '';
    $('itemsHint').textContent = rm
      ? '(the wording the client sees for each Scope of Work row above. Prices are set in Contract Pricing.)'
      : '(the vendor\'s scope, listed under the one priced line "' + (state.sowRows[0] ? state.sowRows[0].svc : 'SOW service') + '" so the proposal matches the invoice. Vendor Cost is for reference only.)';
    state.items.forEach(function (r, i) {
      var tr = document.createElement('tr');
      var row = rm ? rowById(r.rowId) : null;
      tr.innerHTML =
        '<td class="code" data-code></td>' +
        '<td class="area"><input data-f="Area" placeholder="Area (optional)" value="' + esc(r.Area) + '"></td>' +
        '<td class="item"><input data-f="Name" placeholder="Item name" value="' + esc(r.Name) + '"></td>' +
        '<td><textarea data-f="Description" rows="2" placeholder="' + (rm ? 'Client-facing description of this service' : 'Vendor scope, specs, quantities') + '">' + esc(r.Description) + '</textarea></td>' +
        // Row mode: prices live in Contract Pricing above, so this table is for wording only.
        (rm ? '<td class="cost num plain" style="display:none"></td>'
            : '<td class="cost num"><input data-f="Vendor_Cost" inputmode="decimal" value="' + (r.Vendor_Cost == null ? '' : esc(r.Vendor_Cost)) + '"></td>') +
        '<td class="price num" data-price' + (rm ? ' style="display:none"' : '') + '></td>' +
        (rm ? '<td class="tools"></td>'
            : '<td class="tools"><button class="iconbtn" data-up title="Move up">&#9650;</button><button class="iconbtn" data-down title="Move down">&#9660;</button><button class="iconbtn del" data-del title="Remove">&#10005;</button></td>');
      tr.querySelectorAll('[data-f]').forEach(function (el) {
        el.addEventListener('input', function () { r[el.getAttribute('data-f')] = el.value; state.itemsAreDefault = false; state.dirty = true; refresh(); });
      });
      if (!rm) {
        tr.querySelector('[data-up]').onclick = function () { move(i, -1); };
        tr.querySelector('[data-down]').onclick = function () { move(i, 1); };
        tr.querySelector('[data-del]').onclick = function () { state.itemsAreDefault = false; state.items.splice(i, 1); state.dirty = true; renderItems(); refresh(); };
      }
      tb.appendChild(tr);
    });
  }
  function move(i, d) {
    var j = i + d; if (j < 0 || j >= state.items.length) return;
    var t = state.items[i]; state.items[i] = state.items[j]; state.items[j] = t;
    state.dirty = true; renderItems(); refresh();
  }
  function itemsForPricing() {
    return state.items.map(function (r, i) {
      var it = { _i: i, Name: r.Name, Area: r.Area, Description: r.Description, Vendor_Cost: num(r.Vendor_Cost), Sort_Order: i + 1 };
      if (state.rowMode) { var row = rowById(r.rowId); it.Vendor_Cost = row ? num(row.vp) : 0; it.Fixed_Price = row ? r2(num(row.rate)) : 0; if (row && isIncluded(row)) it.Included = true; }
      return it;
    });
  }
  function priced() {
    var t = totals();
    try { return P.price(itemsForPricing(), t.margin, t.client); } catch (e) { return null; }
  }
  // OTS, one SOW row (Shay / Jim, 10/29): the proposal prices ONE line named exactly like the SOW service, at the SOW
  // row's client rate, so it matches the invoice. The vendor's itemized scope prints under it with no prices.
  function lumpLine() {
    if (state.rowMode || !state.sowRows.length) return null;
    var r = state.sowRows[0];
    return { Name: r.svc, Price: r2(num(r.rate)), Cost: r2(num(r.vp)) };
  }

  // ------------------------------------------------------------ refresh + checks
  function refresh() {
    var t = totals();
    $('clientTotalLabel').textContent = state.rateSchedule ? 'Est. Client Value' : 'Client Total';
    $('clientTotal').textContent = P.money(t.client);
    $('vendorTotal').textContent = P.money(t.vendor);
    $('profit').textContent = P.money(t.profit) + '  (' + t.margin + '%)';
    var trs = $('sowRows').children;
    state.sowRows.forEach(function (r, i) {
      var cell = trs[i] && trs[i].querySelector('[data-m]');
      if (cell) cell.textContent = r.rate > 0 ? r1((r.rate - r.vp) / r.rate * 100) + '%' : (isIncluded(r) ? 'Included' : '-');
    });
    var p = priced(), itr = $('rows').children;
    if (p) p.items.forEach(function (it) {
      var tr = itr[it._i]; if (!tr) return;
      tr.querySelector('[data-code]').textContent = it.Item_No;
      tr.querySelector('[data-price]').textContent = (state.rowMode && !it.Included) ? P.money(it.Client_Price) : 'Included';
    });
    // Winter: no estimated totals or weighted margin; each tier stands on its own.
    Array.prototype.forEach.call(document.querySelectorAll('.card.totals'), function (c) { c.style.display = state.winter ? 'none' : ''; });
    $('tierCard').style.display = state.winter ? '' : 'none';
    if (state.winter) {
      var ms = state.sowRows.map(rowMargin).filter(function (x) { return x != null && isFinite(x); });
      $('tierRange').textContent = ms.length ? (Math.min.apply(null, ms) === Math.max.apply(null, ms) ? Math.min.apply(null, ms) + '%' : Math.min.apply(null, ms) + '% to ' + Math.max.apply(null, ms) + '%') : '-';
    }
    var mi = num($('margin').value), shown = currentMargin();
    $('marginTools').style.display = (state.hasSowRates || state.marginPending) ? '' : 'none';
    $('applyMargin').style.display = state.marginPending ? '' : 'none';
    $('restoreRates').style.display = state.hasSowRates && state.sowRows.some(function (r) { return num(r.sowRate) > 0 && Math.abs(num(r.rate) - num(r.sowRate)) >= 0.005; }) ? '' : 'none';
    $('marginHint').textContent = state.marginPending ? 'Click Apply to reprice every row at ' + mi + '%.'
      : (state.hasSowRates ? (state.winter ? 'Rates shown are the SOW\'s current rates.' : 'Current margin on these rates: ' + shown + '%.') : '');
    var chip = $('approvalChip');
    if (!needsApproval()) { chip.className = 'chip ok'; chip.textContent = 'OK'; }
    else if (approved()) { chip.className = 'chip ok'; chip.textContent = 'Approved by Jim'; }
    else if (pendingRequest()) { chip.className = 'chip warn'; chip.textContent = 'Pending Jim'; }
    else { chip.className = 'chip bad'; chip.textContent = 'Needs Jim approval'; }
    var blocked = needsApproval() && !approved();
    $('requestBtn').style.display = blocked && !isJim() ? '' : 'none';
    $('approveBtn').style.display = blocked && isJim() ? '' : 'none';
    if (!state.busy) {
      var nProb = problems().length;
      var done = state.justGenerated && !state.dirty;
      $('generateBtn').disabled = blocked || nProb > 0 || !!done;
      $('generateBtn').title = blocked ? "A blended contract margin under 10% needs Jim's approval first." : (nProb ? 'Fix the items in red above to turn on Generate.' : '');
      var lockNote = blocked ? "Generate is locked until Jim approves this pricing." : (nProb ? 'Generate is locked: fix the ' + nProb + ' item' + (nProb > 1 ? 's' : '') + ' in red above.' : '');
      if (done && !blocked && !nProb) lockNote = 'Rev ' + state.justGenerated + ' is attached. Change anything to generate another revision.';
      $('lockNote').textContent = lockNote;
    }
    showChecks();
  }

  // Vendor names from every bid on this SOW, cut to their core ("Landscape Workshop, LLC-5429" -> "landscape workshop").
  // A name made only of generic service words ("Lawn Care Services") is skipped so ordinary scope text never trips it,
  // and names only match as whole words.
  var GENERIC = /^(the|and|of|lawn|lawns|care|landscape|landscaping|landscapes|snow|removal|plowing|plow|services?|maintenance|property|properties|solutions|group|company|contractors?|contracting|construction|outdoor|outdoors|tree|trees|management|facility|facilities|cleaning|exterior|commercial|general|enterprises?|llc|inc|co|grounds|land|green|pro|pros|professional|ice|salt|mowing|irrigation|paving|fence|fencing|door|doors|electric|electrical|plumbing|hvac|roofing|janitorial|power|wash|washing|pressure)$/;
  function vendorNames() {
    var seen = {};
    state.bids.forEach(function (b) {
      var n = String((b.Vendor && b.Vendor.name) || '').toLowerCase()
        .replace(/\([^)]*\)/g, ' ').replace(/[-\s]*\d+\s*$/, '').replace(/[.,&']/g, ' ')
        .replace(/\b(llc|inc|co|corp|corporation|company|ltd|l l c|dba)\b/g, ' ').replace(/\s+/g, ' ').trim();
      if (n.length < 5) return;
      if (n.split(' ').every(function (w) { return GENERIC.test(w); })) return;
      seen[n] = true;
    });
    return Object.keys(seen);
  }
  function clientText() {
    var parts = [['Project Title', $('t_title').value], ['Scope Reference', $('t_scope').value], ['Project Summary', $('t_summary').value]];
    SECTIONS.forEach(function (k) { parts.push([$('t_' + k).previousElementSibling ? $('t_' + k).previousElementSibling.textContent : k, $('t_' + k).value]); });
    state.items.forEach(function (it, i) { parts.push(['Line item ' + (i + 1), [it.Area, it.Name, it.Description].join(' ')]); });
    return parts;
  }
  function vendorLeaks() {
    var names = vendorNames(), out = [];
    if (!names.length) return out;
    clientText().forEach(function (p) {
      var t = ' ' + String(p[1] || '').toLowerCase().replace(/[.,&'()]/g, ' ').replace(/\s+/g, ' ') + ' ';
      names.forEach(function (n) { if (t.indexOf(' ' + n + ' ') >= 0) out.push('The vendor name "' + n + '" appears in ' + p[0] + '. Remove it; the client proposal must not name the vendor.'); });
    });
    return out;
  }

  function problems() {
    var out = [];
    if (!$('t_title').value.trim()) out.push('Project Title is blank.');
    if (!$('t_client').value.trim()) out.push('Client is blank.');
    if (!$('t_loc').value.trim()) out.push('Project Location is blank.');
    if (!state.contact) out.push('The SOW has no Sales Associate, so there is no Primary Olio Contact for the proposal.');
    if (!$('t_summary').value.trim()) out.push('Project Summary is blank.');
    if (!state.sowRows.length) out.push('The SOW has no Scope of Work rows to price.');
    if (state.bids.length && !state.bidId) out.push('Choose which bid this proposal is based on.');
    if (!state.items.length) out.push('Add at least one proposal line item.');
    state.sowRows.forEach(function (r) {
      if (!(num(r.vp) > 0) && !isIncluded(r)) out.push('No vendor price for ' + r.svc + (state.bidId ? ' on the chosen bid' : ' on the SOW') + '. Enter the vendor\'s price on the ' + (state.bidId ? 'bid' : 'SOW') + ' row, then close and reopen this window.');
    });
    state.items.forEach(function (r, i) {
      if (!String(r.Name || '').trim()) out.push('Line item ' + (i + 1) + ' has no item name.');
    });
    state.sowRows.forEach(function (r) { if (!(r.rate > 0) && !isIncluded(r)) out.push('Client rate for ' + r.svc + ' is blank.'); });
    vendorLeaks().forEach(function (x) { out.push(x); });
    if (!state.rowMode && !state.itemsAreDefault && state.itemsBid && state.bidId && state.itemsBid !== state.bidId)
      out.push('The line items were drafted from a different bid\'s quote than the one chosen. Run AI Bid Reader for this bid, or click Reset items from SOW rows.');
    return out;
  }

  function showChecks() {
    $('msgs').innerHTML = '';
    state.readerNotes.forEach(function (w) { msg('warn', 'Reader note: ' + w); });
    if (state.bids.length && state.summaryFromSow) msg('info', 'The chosen bid has no vendor document for AI Bid Reader, so the Project Title and Summary were drafted from the SOW details. Review them before generating.');
    if (!state.bids.length) msg('info', 'No bid on this SOW: pricing comes from the SOW rows' + (state.summaryFromSow ? ', and the Project Summary was drafted from the SOW details. Review it before generating.' : '.'));
    var inc = state.sowRows.filter(isIncluded);
    if (inc.length) msg('info', inc.map(function (r) { return r.svc; }).join(', ') + (inc.length > 1 ? ' have' : ' has') + ' no vendor price or client rate, so ' + (inc.length > 1 ? 'they print' : 'it prints') + ' as "Included" (covered by the priced line). To charge separately, enter a client rate and the vendor\'s price.');
    problems().forEach(function (p) { msg('err', p); });
    var t = totals();
    // OTS: the job is priced at the SOW row. The vendor quote's own line costs are only checked against the bid.
    var costed = state.items.filter(function (r) { return num(r.Vendor_Cost) > 0; });
    var itemCost = r2(costed.reduce(function (s, r) { return s + num(r.Vendor_Cost); }, 0));
    if (!state.rowMode && costed.length && Math.abs(itemCost - t.vendor) > 0.5) msg('warn', 'The vendor quote lines add up to ' + P.money(itemCost) + ', but the ' + (state.bidId ? 'bid' : 'SOW') + ' vendor price is ' + P.money(t.vendor) + '. The proposal is priced from the ' + (state.bidId ? 'bid' : 'SOW') + '; check for a missing line or a wrong bid price.');
    if (!state.rowMode && state.aiTotal != null && state.aiTotal > 0 && Math.abs(state.aiTotal - t.vendor) > 0.5 && Math.abs(itemCost - t.vendor) <= 0.5) msg('warn', 'The vendor proposal states a total of ' + P.money(state.aiTotal) + ', but the ' + (state.bidId ? 'bid' : 'SOW') + ' vendor price is ' + P.money(t.vendor) + '.');
    state.sowRows.forEach(function (r) {
      if (r.sowVp != null && r.sowVp !== '' && Math.abs(num(r.sowVp) - r.vp) > 0.5) msg('info', r.svc + ': the SOW shows a vendor price of ' + P.money(r.sowVp) + '; using the chosen bid\'s ' + P.money(r.vp) + '.');
    });
    // Approval and the 15% review are judged on the blended contract margin; low lines are listed for context only.
    var b = blendedMargin(), F = P.MARGIN_FLOOR_WITHOUT_APPROVAL, multi = pricedRows().length > 1;
    var what = multi ? 'The blended contract margin' : 'The margin';
    var lowList = function (floor) { return linesUnder(floor).map(function (r) { return r.svc + ' ' + rowMargin(r) + '%'; }).join(', '); };
    if (b != null && b < F && !approved()) msg('warn', what + ' is ' + b + '%, under the 10% floor. Jim must approve this pricing before the proposal can be generated.');
    else if (b != null && b < TARGET_MIN) msg('warn', what + ' is ' + b + '%, below our preferred 15%. Please review.');
    else if (b != null && multi && linesUnder(TARGET_MIN).length) msg('info', 'Lines under 15%: ' + lowList(TARGET_MIN) + '. No approval needed: the blended contract margin is ' + b + '%.');
    var under = linesUnder(0.0001);
    if (under.length) msg('warn', 'Priced below vendor cost: ' + lowList(0.0001) + '. Check this is intended.');
    var high = state.sowRows.filter(function (r) { var m = rowMargin(r); return num(r.vp) > 0 && m != null && m >= 60; });
    if (high.length) msg('info', 'Unusually high margin, check the rate: ' + high.map(function (r) { return r.svc + ' ' + rowMargin(r) + '%'; }).join(', ') + '.');
    if (!state.rowMode && state.sowRows.length === 1 && num(state.sowRows[0].n) > 1) msg('warn', 'This OTS row has Number of Services = ' + num(state.sowRows[0].n) + '. The proposal prices the scope once at ' + P.money(state.sowRows[0].rate) + '. Check the SOW row if that is not right.');
    var ch = rateChanges();
    if (ch.length) msg('info', ch.length + ' existing client rate' + (ch.length > 1 ? 's' : '') + ' on the SOW will change when you Generate (you will be asked to confirm). Save draft and Preview PDF do not change SOW pricing.');
    if (state.dirty) msg('warn', 'You have unsaved changes. Save draft or Generate to keep them.');
  }

  // ------------------------------------------------------------ save to SOW
  function draftJson() {
    var sec = {}; SECTIONS.forEach(function (k) { sec[k] = $('t_' + k).value; });
    return JSON.stringify({ v: 1, wv: VERSION, bidId: state.bidId, title: $('t_title').value, scopeRef: $('t_scope').value, location: $('t_loc').value, client: $('t_client').value,
      summary: $('t_summary').value, sections: sec, gm: state.generatedMargin != null ? state.generatedMargin : (state.draft.gm != null ? state.draft.gm : null),
      m: marginInput(), rates: ratesMap(), itemsBid: state.itemsAreDefault ? null : (state.itemsBid || null), requestedKey: state.draft.requestedKey || null, genBy: state.genBy || state.draft.genBy || null, items: state.items.map(function (i) { var o = { Name: i.Name, Area: i.Area, Description: i.Description, Vendor_Cost: num(i.Vendor_Cost) }; if (i.rowId) o.rowId = i.rowId; return o; }), aiTotal: state.aiTotal });
  }
  function ratesMap() { var o = {}; state.sowRows.forEach(function (r) { o[r.id] = r2(num(r.rate)); }); return o; }
  // Save draft / approval steps: the proposal draft only. SOW pricing (client and vendor prices) is never touched here.
  function saveDraftOnly(extra) {
    var upd = Object.assign({ id: state.id, Proposal_Draft_Data: draftJson() }, extra || {});
    return ZOHO.CRM.API.updateRecord({ Entity: SOW, APIData: upd, Trigger: [] }).then(function (r) {
      check(r, 'Saving the draft'); Object.assign(state.sow, upd);
      try { state.draft = JSON.parse(upd.Proposal_Draft_Data); } catch (e) {}
      state.dirty = false; return r; });
  }
  // Rows whose existing SOW client rate would change on Generate.
  function rateChanges() {
    return state.sowRows.filter(function (r) { return num(r.sowRate) > 0 && num(r.rate) > 0 && Math.abs(num(r.rate) - num(r.sowRate)) >= 0.005; });
  }
  // Generate only: writes the client rates (and fills blank vendor prices) on the SOW.
  function sowUpdate(extra) {
    var t = totals();
    var upd = { id: state.id, Proposal_Margin: t.margin, Proposal_Client_Total: state.rateSchedule ? null : t.client, Proposal_Draft_Data: draftJson(),
      Scope_of_Work: state.sowRows.map(function (r) {
        var x = { id: r.id };
        if (num(r.rate) > 0) x.Invoice_Price = r2(r.rate);   // never blank out a client rate
        // Fill a blank SOW vendor price from the bid, but never write a blank or $0 price.
        if ((r.sowVp == null || r.sowVp === '' || num(r.sowVp) === 0) && num(r.vp) > 0) x.Vendor_Price = r.vp;
        return x;
      }) };
    // Approval fields are written only by Jim's Approve step (they are read-only for Sales profiles).
    Object.assign(upd, extra || {});
    return ZOHO.CRM.API.updateRecord({ Entity: SOW, APIData: upd, Trigger: [] }).then(function (r) {
      check(r, 'Saving to the SOW');
      // merge the subform write into the loaded rows instead of replacing them
      var sub = {}; upd.Scope_of_Work.forEach(function (x) { sub[x.id] = x; });
      (state.sow.Scope_of_Work || []).forEach(function (row) { if (sub[row.id]) Object.assign(row, sub[row.id]); });
      var rest = Object.assign({}, upd); delete rest.Scope_of_Work; Object.assign(state.sow, rest);
      try { state.draft = JSON.parse(upd.Proposal_Draft_Data); } catch (e) {}
      state.sowRows.forEach(function (row) { if (num(row.rate) > 0) row.sowRate = row.rate; if ((row.sowVp == null || row.sowVp === '' || num(row.sowVp) === 0) && num(row.vp) > 0) row.sowVp = row.vp; });
      state.hasSowRates = state.sowRows.some(function (row) { return num(row.sowRate) > 0; });
      state.dirty = false; return r; });
  }
  // Targeted SOW Summary refresh (Jim, 10/29): rebuilds only the SOW_Summary text, in the exact format of the
  // "Update Category - Summary - Start/End Date" function, with no workflows triggered. It runs after the
  // pricing write and never blocks Generate; if it fails the rep is told and the Summary refreshes on the next SOW edit.
  function pad(v, n) { return (String(v) + new Array(n + 1).join(' ')).substring(0, n); }
  function summaryText() {
    var byId = {}; state.sowRows.forEach(function (r) { byId[r.id] = r; });
    var out = 'SOW Item Name | Client Price | Vendor Price\n' + new Array(58).join('-') + '\n';
    (state.sow.Scope_of_Work || []).forEach(function (row) {
      if (!row.OurServices || !row.OurServices.name) return;
      var r = byId[row.id], ip = row.Invoice_Price, vpv = row.Vendor_Price;
      if (r && num(r.rate) > 0) ip = r2(num(r.rate));
      if (r && (vpv == null || vpv === '' || num(vpv) === 0) && num(r.vp) > 0) vpv = r.vp;
      out += pad(row.OurServices.name, 25) + ' | ' + pad(ip == null || ip === '' ? 0 : ip, 12) + ' | ' + pad(vpv == null || vpv === '' ? 0 : vpv, 12) + '\n';
    });
    return out;
  }
  function refreshSummary() {
    var text = summaryText();
    return ZOHO.CRM.API.updateRecord({ Entity: SOW, APIData: { id: state.id, SOW_Summary: text }, Trigger: [] })
      .then(function (r) { check(r, 'Refreshing the SOW Summary'); state.sow.SOW_Summary = text; return true; })
      .catch(function (e) { msg('warn', 'The proposal is done, but the SOW Summary could not be refreshed (' + errText(e) + '). It will refresh the next time the SOW is edited.'); return false; });
  }

  // ------------------------------------------------------------ pdf
  function recForPdf(rev, dateISO) {
    var sec = {}; SECTIONS.forEach(function (k) { sec[k] = $('t_' + k).value; });
    return Object.assign({ Name: $('t_title').value.trim(), Scope_Reference: $('t_scope').value.trim(), Project_Location: $('t_loc').value.trim(), Client_Name: $('t_client').value.trim(),
      Prepared_Date: dateISO || todayISO(), Revision: rev, Proposal_No: (state.sow.Deal_Name || 'Proposal') + '-R' + rev, Valid_Days: VALID_DAYS, Margin: totals().margin, Project_Summary: $('t_summary').value, _contact: state.contact, Rate_Schedule: state.rateSchedule }, sec);
  }
  function buildPdf(rev, draftLabel) {
    return P.build(window.jspdf.jsPDF, recForPdf(rev), itemsForPricing(), { logo: window.OLIO_LOGO, logoRatio: window.OLIO_LOGO_RATIO, draftLabel: draftLabel, targetTotal: totals().client, lumpLine: lumpLine() });
  }
  function nextRev() {
    if (!state.sow) return 1;
    return state.sow.Last_Proposal_Generated ? (num(state.sow.Proposal_Revision) || 1) + 1 : 1;
  }
  // Download PDF: the last preview (marked DRAFT) or the last generated proposal.
  function setDownload(doc, name) { state.lastPdf = { blob: doc.output('blob'), name: name }; $('downloadBtn').style.display = ''; $('downloadBtn').textContent = /DRAFT/.test(name) ? 'Download draft PDF' : 'Download PDF'; }
  function download() {
    if (!state.lastPdf) return;
    var a = document.createElement('a'); a.href = URL.createObjectURL(state.lastPdf.blob); a.download = state.lastPdf.name;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    setStatus('Downloading "' + state.lastPdf.name + '". It is also attached to the SOW after Generate.');
  }
  function showPreview(doc) {
    var f = $('preview'); f.style.display = 'block'; f.src = URL.createObjectURL(doc.output('blob'));
    f.scrollIntoView({ behavior: 'smooth' });
  }
  function fileName(rev) {
    var t = $('t_title').value.replace(/[\\/:*?"<>|]/g, '').trim() || 'Client Proposal';
    return 'Olio Group - ' + t + ' Client Proposal Rev ' + rev + '.pdf';
  }

  function preview() {
    try {
      if (!state.sow) throw new Error('SOW is still loading. Wait a moment and try again.');
      var rev = nextRev(), d = buildPdf(rev, 'DRAFT PREVIEW - NOT FOR CLIENT').doc;
      showPreview(d); setDownload(d, fileName(rev).replace(/\.pdf$/, ' (DRAFT PREVIEW).pdf'));
      setStatus('Preview ready below. Nothing was saved.');
    }
    catch (e) { msg('err', 'Preview failed: ' + errText(e)); }
  }

  function generate() {
    if (state.busy || state.generating) return;   // a double click must never generate twice
    if (problems().length || (needsApproval() && !approved())) { refresh(); return; }
    var ch = rateChanges();
    if (!ch.length) return doGenerate();
    // Never change existing client pricing without an explicit yes.
    askConfirm('Change client rates on the SOW?',
      'Generating will change these client rates on the SOW:\n\n' + ch.map(function (r) { return r.svc + ':  ' + P.money(r.sowRate) + '  to  ' + P.money(r.rate); }).join('\n') +
      '\n\nCancel to keep reviewing. Nothing has been saved yet.', 'Change rates and generate')
      .then(function (yes) { if (yes) doGenerate(); else setStatus('Generate cancelled. SOW pricing was not changed.'); });
  }
  function doGenerate() {
    if (state.generating) return;
    state.generating = true;
    var rev = nextRev(), out, name;
    busy(true, 'Building PDF...');
    try { out = buildPdf(rev, ''); name = fileName(rev); } catch (e) { state.generating = false; busy(false, ''); msg('err', 'PDF failed: ' + errText(e)); return; }
    var rec = recForPdf(rev);
    state.generatedMargin = marginInput();
    state.genBy = state.user ? state.user.full_name : null;
    setStatus('Attaching PDF to the SOW...');
    var attached = false;
    ZOHO.CRM.API.attachFile({ Entity: SOW, RecordID: state.id, File: { Name: name, Content: out.doc.output('blob') } }).then(function (ar) {
      check(ar, 'Attaching the PDF'); attached = true;
      setStatus('Saving pricing and suggested addendums to the SOW...');
      return sowUpdate({
        Proposal_Revision: rev,
        Last_Proposal_Generated: new Date().toISOString().replace(/\.\d{3}Z$/, '+00:00'),
        Suggested_Client_Addendum: P.addendumText(out.priced, rec, 'client'),
        Suggested_Vendor_Addendum: P.addendumText(out.priced, rec, 'vendor')
      });
    }).then(function () {
      setStatus('Refreshing the SOW Summary...');
      return refreshSummary();
    }).then(function () {
      state.generating = false; state.justGenerated = rev;
      showPreview(out.doc); setDownload(out.doc, name); renderLastProp();
      busy(false, 'Done. "' + name + '" is attached to the SOW, client rates are set, and the Suggested Addendums are filled in.');
    }).catch(function (e) {
      state.generating = false;
      busy(false, '');
      if (attached) msg('err', 'Generate did not finish. "' + name + '" WAS attached to the SOW, but the SOW pricing and proposal fields were NOT updated (' + errText(e) + '). Delete that attachment, then click Generate again.');
      else msg('err', 'Generate failed before anything was saved. Nothing on the SOW changed (' + errText(e) + ').');
    });
  }

  // ------------------------------------------------------------ approval
  function requestApproval() {
    var b = blendedMargin(), key = approvalKey();
    busy(true, 'Requesting approval...');
    state.draft.requestedKey = key;
    saveDraftOnly().then(function () {
      var due = new Date(); due.setDate(due.getDate() + 1);
      var lines = pricedRows().map(function (r) { return r.svc + ': vendor ' + P.money(r.vp) + ', client ' + P.money(r.rate) + ' (' + rowMargin(r) + '%)'; }).join('; ');
      return ZOHO.CRM.API.insertRecord({ Entity: 'Tasks', APIData: {
        Subject: 'Approve contract margin under 10%: ' + (state.sow.Deal_Name || 'client proposal'),
        Owner: { id: JIM_ID }, What_Id: { id: state.id }, $se_module: SOW, Due_Date: due.toISOString().slice(0, 10), Priority: 'High',
        Description: (state.user ? state.user.full_name : 'A rep') + ' is requesting approval for a blended contract margin of ' + b + '% (under 10%). ' + lines + '. Open the SOW, click Generate Client Proposal, review the rates, then click Approve this pricing. The approval covers these exact rates only.'
      }, Trigger: ['workflow'] });
    }).then(function () { busy(false, 'Approval requested. Jim has a task on this SOW.'); })
      .catch(function (e) { busy(false, ''); msg('err', 'Request failed: ' + errText(e)); });
  }
  function approve() {
    var key = approvalKey(), m = blendedMargin();
    busy(true, 'Approving...');
    // Approval covers these exact vendor prices and client rates. Proposal_Approved_Pricing is read-only for Sales profiles.
    saveDraftOnly({ Proposal_Margin_Approval: 'Approved by Jim', Proposal_Approved_Margin: m, Proposal_Approved_Pricing: key })
      .then(function () { busy(false, 'Pricing approved (blended margin ' + m + '%). Any change to these rates needs a new approval.'); })
      .catch(function (e) { busy(false, ''); msg('err', 'Approve failed: ' + errText(e)); });
  }

  // ------------------------------------------------------------ in-widget confirm (replaces the browser popup)
  function askConfirm(title, body, okText) {
    return new Promise(function (resolve) {
      $('modalTitle').textContent = title;
      $('modalBody').textContent = body;
      $('modalOk').textContent = okText || 'Continue';
      $('modalBack').classList.add('open');
      function done(v) { $('modalBack').classList.remove('open'); $('modalOk').onclick = $('modalCancel').onclick = null; resolve(v); }
      $('modalOk').onclick = function () { done(true); };
      $('modalCancel').onclick = function () { done(false); };
      $('modalOk').focus();
    });
  }

  // ------------------------------------------------------------ AI draft (Gabriel's reader)
  function readVendorProposal() {
    if (!state.bids.length) { msg('info', 'There is no bid on this SOW, so there is no vendor proposal to read. Pricing comes from the SOW rows, and the Project Summary was drafted from the SOW details. Edit it as needed, then generate.'); return; }
    if (!state.bidId) { msg('err', 'Choose the bid first; the reader uses that bid\'s vendor proposal.'); return; }
    askConfirm('Use the AI Bid Reader?',
      state.rowMode
        ? 'The AI Bid Reader will read the vendor proposal on this bid and draft the project summary, plus any clarifications and exclusions it finds. The line items stay matched to this SOW\'s Scope of Work rows. You can review and edit everything before generating.'
        : 'The AI Bid Reader will read the vendor proposal on this bid and replace the current line items and project summary with a draft. You can review and edit everything before generating.',
      'Continue with AI Bid Reader').then(function (yes) { if (yes) runReader(); });
  }

  function runReader() {
    busy(true, 'AI Bid Reader is reading the vendor proposal (this can take up to a minute)...');
    ZOHO.CRM.FUNCTIONS.execute(AI_FUNCTION, { arguments: JSON.stringify({ sow_id: state.id, bid_id: state.bidId }) }).then(function (resp) {
      var raw = resp && resp.details && (resp.details.output || resp.details.userMessage);
      if (!raw) throw new Error('No draft came back. ' + (resp && resp.message ? resp.message : ''));
      var ok = applyDraft(typeof raw === 'string' ? JSON.parse(raw) : raw);
      busy(false, ok ? 'Draft loaded. Review every line before generating.' : 'The vendor proposal could not be read. See the note above.');
    }).catch(function (e) { busy(false, ''); msg('err', 'The vendor proposal reader is not connected yet (' + errText(e) + '). Enter or edit the line items by hand for now.'); });
  }
  function applyDraft(d) {
    state.readerNotes = (d.warnings || []).slice();
    if (state.rowMode) {
      // Line items come from the SOW rows, so notes about the quote's own line items do not apply here.
      state.readerNotes = state.readerNotes.filter(function (w) { return !/line item|has no price|no total|total of|vendor_total|quote rows|bid rows/i.test(w); });
      var got = false;
      if (d.project_summary) { $('t_summary').value = P.clean(d.project_summary); got = true; }
      if (d.project_title && !state.draft.title) $('t_title').value = P.clean(d.project_title);
        addTextLines('Exclusions', d.vendor_exclusions);
      addTextLines('Clarifications', d.vendor_clarifications);
      if (!got && !state.readerNotes.length) state.readerNotes.push('Nothing could be read from the vendor proposal. The current text was kept.');
      state.dirty = true; renderItems(); refresh();
      return got;
    }
    var drafted = [];
    (d.areas || []).forEach(function (a) { (a.items || []).forEach(function (it) { drafted.push({ Name: P.clean(it.name || ''), Area: P.clean(a.name || ''), Description: P.clean(it.description || ''), Vendor_Cost: it.vendor_cost }); }); });
    if (!drafted.length) {
      // Nothing readable: keep the current line items and text, and show why.
      if (!state.readerNotes.length) state.readerNotes.push('No line items could be read from the vendor proposal. The current line items were kept.');
      else state.readerNotes.push('The current line items were kept.');
      renderItems(); refresh();
      return false;
    }
    state.itemsAreDefault = false;
    state.itemsBid = state.bidId;
    state.items = drafted;
    state.aiTotal = d.vendor_total == null ? null : num(d.vendor_total);
    if (d.project_summary) $('t_summary').value = P.clean(d.project_summary);
    if (d.project_title && !state.draft.title) $('t_title').value = P.clean(d.project_title);
    addTextLines('Exclusions', d.vendor_exclusions);
    addTextLines('Clarifications', d.vendor_clarifications);
    state.dirty = true; renderItems(); refresh();
    return true;
  }

  function addTextLines(key, extra) {
    if (!extra || !extra.length) return;
    var base = $('t_' + key).value.trim(), have = base.toLowerCase();
    var add = extra.map(function (x) { return P.clean(x); }).filter(function (x) { return x && have.indexOf(String(x).toLowerCase()) < 0; });
    if (add.length) $('t_' + key).value = base + '\n' + add.join('\n');
  }

  // ------------------------------------------------------------ wire up
  function init() {
    $('logo').src = window.OLIO_LOGO;
    // New SOWs reprice live as the margin changes. An SOW that already has client rates only reprices when the rep
    // clicks Apply to all rows (or presses Enter), so existing pricing never changes by accident.
    function applyMargin() {
      var m = marginInput();
      state.sowRows.forEach(function (r) { priceRow(r, m); });
      state.marginPending = false; state.dirty = true; renderSowRows(); refresh();
    }
    $('margin').addEventListener('input', function () {
      if (state.hasSowRates) { state.marginPending = true; refresh(); return; }
      applyMargin();
    });
    $('margin').addEventListener('keydown', function (e) { if (e.key === 'Enter' && state.marginPending) applyMargin(); });
    $('applyMargin').onclick = applyMargin;
    $('restoreRates').onclick = function () {
      state.sowRows.forEach(function (r) { if (num(r.sowRate) > 0) r.rate = num(r.sowRate); });
      state.marginPending = false; $('margin').value = currentMargin(); state.dirty = true; renderSowRows(); refresh();
    };
    $('bidSel').addEventListener('change', function () {
      state.bidId = $('bidSel').value || null;
      state.readerNotes = [];
      var m = marginInput(), brows = bidRowsFor(state.bidId);
      state.sowRows.forEach(function (r) {
        var match = brows.filter(function (b) { return b.OurServices && b.OurServices.id === r.svcId; })[0];
        if (match && match.Vendor_Price != null) r.vp = num(match.Vendor_Price);
        priceRow(r, m);
      });
      if (state.itemsAreDefault && !state.rowMode) itemsFromSow();
      state.dirty = true; renderBidSelect(); renderSowRows(); renderItems(); refresh();
    });
    ['t_title', 't_scope', 't_loc', 't_client', 't_summary'].concat(SECTIONS.map(function (k) { return 't_' + k; })).forEach(function (id) {
      $(id).addEventListener('input', function () { state.dirty = true; refresh(); });
    });
    $('addRow').onclick = function () {
      var last = state.items.length ? state.items[state.items.length - 1].Area : '';
      state.items.push({ Name: '', Area: last, Description: '', Vendor_Cost: '' }); state.dirty = true; renderItems(); refresh();
      var inputs = $('rows').querySelectorAll('input[data-f="Name"]'); if (inputs.length) inputs[inputs.length - 1].focus();
    };
    $('fromSow').onclick = function () { askConfirm('Reset line items?', 'This replaces the proposal line items with one line per Scope of Work row on this SOW.', 'Reset items').then(function (yes) { if (yes) { itemsFromSow(); state.dirty = true; renderItems(); refresh(); } }); };
    $('saveBtn').onclick = function () { busy(true, 'Saving...'); saveDraftOnly().then(function () { busy(false, 'Draft saved. SOW pricing was not changed.'); }).catch(function (e) { busy(false, ''); msg('err', 'Save failed: ' + errText(e)); }); };
    $('previewBtn').onclick = preview;
    $('downloadBtn').onclick = download;
    $('generateBtn').onclick = generate;
    $('requestBtn').onclick = requestApproval;
    $('approveBtn').onclick = approve;
    $('aiBtn').onclick = readVendorProposal;
  }

  ZOHO.embeddedApp.on('PageLoad', function (data) {
    var id = data && data.EntityId; state.id = Array.isArray(id) ? id[0] : id;
    try { ZOHO.CRM.UI.Resize({ height: '820', width: '1240' }); } catch (e) {}
    init();
    busy(true, 'Loading SOW...');
    load()
      .then(function () { busy(false, ''); })
      .catch(function (e) {
        busy(false, '');
        msg('err', 'Could not load this SOW: ' + errText(e));
      });
  });
  ZOHO.embeddedApp.init();
})();
