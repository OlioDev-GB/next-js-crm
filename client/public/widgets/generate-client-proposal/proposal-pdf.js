/*
 * Olio Group Client Proposal - locked PDF template and pricing math.
 * Every client proposal generated from the CRM is drawn by this file.
 * Changing the look of the proposal means changing this file (and only this file).
 */
(function (root) {
  'use strict';

  var GREEN = [1, 129, 78];      // #01814E
  var MINT = [244, 248, 247];    // #F4F8F7
  var BODY = [51, 51, 51];       // #333333
  var LINE = [213, 227, 221];    // #D5E3DD
  var WHITE = [255, 255, 255];

  var PAGE_W = 612, PAGE_H = 792;
  var LM = 54, RM = 54, CW = PAGE_W - LM - RM;
  var TOP = 54, BOTTOM = 61;     // content stops above the footer
  var FOOTER = 'Olio Group | 100 South 1st Street, PO Box 583442, Minneapolis, MN 55458 | 612 888 6525';
  var TAGLINE = 'Facility Services | Project Delivery | Vendor Management';
  var MAIN_PHONE = '612 888 6525';

  var STANDARD_TEXT = {
    Work_Methods: [
      'Coordination: all work is scheduled with the site contact in advance, with access, hours and site rules confirmed before crews arrive.',
      'Materials: all materials are commercial grade and installed to manufacturer specifications.',
      'Site protection: work areas are protected during the work and cleaned daily.',
      'Debris: removed materials and job debris are hauled away and disposed of offsite.'
    ].join('\n'),
    Staffing_and_QC: [
      "Olio Group assigns a dedicated project contact who coordinates crews, schedules the work and serves as the client's single point of contact.",
      'Work is performed by experienced, insured commercial crews qualified for the scope.',
      'Each scope item is inspected at completion against this proposal, with before and after photos provided.',
      'A final walkthrough is held with the client before closeout, and any punch-list items are corrected.'
    ].join('\n'),
    Safety: [
      'All crews follow OSHA requirements and site-specific safety rules.',
      'PPE is required for all onsite personnel.',
      'Work zones are barricaded as needed and kept clean daily.',
      'Hot work, lift operation and other higher-risk tasks are performed by trained personnel with the required controls in place.'
    ].join('\n'),
    Schedule: [
      'Work begins after signed authorization, on a start date confirmed with the client.',
      'Olio Group will provide a project schedule at award and keep the client updated on progress through completion.',
      'Final cleaning, walkthrough and closeout documentation are completed at the end of the project.'
    ].join('\n'),
    Clarifications: [
      'Pricing is based on the scope and quantities listed in this proposal.',
      'Pricing includes all labor, materials and equipment needed to complete each item as described.',
      'Site access and utilities (power and water) will be available during scheduled work hours.',
      'Quantities found to differ materially from those listed will be reviewed with the client before any change in price.',
      'This proposal is valid for 30 days from the prepared date.'
    ].join('\n'),
    Exclusions: [
      'Any work not specifically listed in the Scope of Work.',
      'Building permits, plan review or inspection fees, if required by the jurisdiction.',
      'Hazardous material testing or abatement (including asbestos, lead or contaminated soil).',
      'Repairs to concealed or unforeseen conditions discovered during the work.',
      'After-hours, weekend or holiday work unless requested and approved in advance.'
    ].join('\n')
  };

  var SECTION_ORDER = [
    ['Work_Methods', 'Work Methods'],
    ['Staffing_and_QC', 'Project Staffing and Quality Control'],
    ['Safety', 'Safety'],
    ['Schedule', 'Schedule'],
    ['Clarifications', 'Clarifications and Assumptions'],
    ['Exclusions', 'Exclusions']
  ];

  var MARGIN_DEFAULT = 20;
  var MARGIN_FLOOR_WITHOUT_APPROVAL = 10;

  // ---------------------------------------------------------------- math
  function round2(v) { return Math.round((v + Number.EPSILON) * 100) / 100; }

  function clientPrice(cost, marginPct) {
    var m = Number(marginPct) / 100;
    if (!(m >= 0 && m < 0.95)) throw new Error('Margin must be between 0% and 95%.');
    return round2(Number(cost || 0) / (1 - m));
  }

  /*
   * items: [{Name, Area, Description, Vendor_Cost, Sort_Order}]
   * returns {areas:[{code,name,items:[...],subtotal,cost}], items:[...with Item_No, Client_Price], vendorTotal, clientTotal, profit, marginActual}
   */
  /*
   * targetTotal (optional): when given, item prices are allocated in proportion to vendor cost so they
   * add up to exactly this client total (used when the SOW's client rates are the source of truth).
   */
  function price(items, marginPct, targetTotal) {
    var sorted = items.slice().sort(function (a, b) {
      return (Number(a.Sort_Order) || 0) - (Number(b.Sort_Order) || 0);
    });
    var prices = null;
    var allFixed = sorted.length && sorted.every(function (it) { return it.Fixed_Price != null && it.Fixed_Price !== ''; });
    if (targetTotal != null && !allFixed) {
      var costSum = sorted.reduce(function (s, it) { return s + Number(it.Vendor_Cost || 0); }, 0);
      var factor = costSum > 0 ? Number(targetTotal) / costSum : 0;
      prices = sorted.map(function (it) { return round2(Number(it.Vendor_Cost || 0) * factor); });
      var diff = round2(Number(targetTotal) - prices.reduce(function (s, p) { return s + p; }, 0));
      if (diff && prices.length) {
        var big = 0; prices.forEach(function (p, i) { if (p > prices[big]) big = i; });
        prices[big] = round2(prices[big] + diff);
      }
    }
    var areas = [], byName = {};
    sorted.forEach(function (it, idx) {
      var areaName = String(it.Area || '').trim() || 'General Scope';
      if (!byName[areaName]) {
        byName[areaName] = { code: String.fromCharCode(65 + areas.length), name: areaName, items: [], subtotal: 0, cost: 0 };
        areas.push(byName[areaName]);
      }
      var a = byName[areaName];
      // Fixed_Price: the line is a SOW row and its client rate is set on the SOW, so use it as is.
      var p = (it.Fixed_Price != null && it.Fixed_Price !== '') ? round2(Number(it.Fixed_Price))
        : (prices ? prices[idx] : clientPrice(it.Vendor_Cost, marginPct));
      var out = Object.assign({}, it, { Area: areaName, Client_Price: p, Item_No: a.code + (a.items.length + 1) });
      a.items.push(out);
      a.subtotal = round2(a.subtotal + p);
      a.cost = round2(a.cost + Number(it.Vendor_Cost || 0));
    });
    var vendorTotal = 0, clientTotal = 0, all = [];
    areas.forEach(function (a) { vendorTotal = round2(vendorTotal + a.cost); clientTotal = round2(clientTotal + a.subtotal); all = all.concat(a.items); });
    return {
      areas: areas, items: all, vendorTotal: vendorTotal, clientTotal: clientTotal,
      profit: round2(clientTotal - vendorTotal),
      marginActual: clientTotal ? round2((clientTotal - vendorTotal) / clientTotal * 100) : 0
    };
  }

  function money(v) {
    return '$' + Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function longDate(iso) {
    var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    var d = iso ? String(iso).slice(0, 10).split('-') : null;
    var dt = d && d.length === 3 ? { y: +d[0], m: +d[1] - 1, d: +d[2] } : (function () { var n = new Date(); return { y: n.getFullYear(), m: n.getMonth(), d: n.getDate() }; })();
    return months[dt.m] + ' ' + dt.d + ', ' + dt.y;
  }

  function lines(text) {
    return String(text || '').split(/\r?\n/).map(function (s) { return s.replace(/^\s*[-*•]\s*/, '').trim(); }).filter(Boolean);
  }

  function sectionText(rec, key) {
    var v = String(rec[key] || '').trim();
    return v || STANDARD_TEXT[key];
  }

  // Make text safe for the PDF's built-in Helvetica font. Characters outside that font
  // (curly inch marks, en/em dashes, odd spaces) make the PDF fall back to a wide,
  // letter-spaced encoding and break word widths, so they are swapped for plain equivalents.
  function clean(text) {
    if (text == null) return text;
    var t = String(text)
      .replace(/[″“”„‟ʺ˝〃]/g, '"')
      .replace(/[′‘’‚‛ʹʼ]/g, "'")
      .replace(/[‐-―−﹘﹣－]/g, '-')
      .replace(/…/g, '...')
      .replace(/≤/g, '<=').replace(/≥/g, '>=')
      .replace(/[•‣▪●◦⁃]/g, '-')
      .replace(/[   -   　\t]/g, ' ')
      .replace(/[​-‍⁠﻿­]/g, '');
    if (t.normalize) t = t.normalize('NFKC').replace(/[′]/g, "'").replace(/[″]/g, '"');
    t = t.replace(/[^\x0A\x0D\x20-\x7E\xA1-\xFF]/g, '');
    return t.replace(/ {2,}/g, ' ');
  }
  function cleanRec(rec) {
    var o = {}; Object.keys(rec || {}).forEach(function (k) { o[k] = typeof rec[k] === 'string' ? clean(rec[k]) : rec[k]; }); return o;
  }

  // --------------------------------------------------------------- render
  function build(jsPDFCtor, rec, items, opts) {
    opts = opts || {};
    rec = cleanRec(rec);
    items = (items || []).map(cleanRec);
    // Rate schedule: recurring / seasonal SOWs priced per service. No subtotals and no grand total,
    // because per-push or per-visit rates cannot be added together.
    var rateSchedule = !!(rec.Rate_Schedule || opts.rateSchedule);
    // Lump line (OTS, one SOW row): one priced line named exactly like the SOW service, so the proposal matches the
    // invoice. The vendor's itemized scope prints under Scope of Work with no prices.
    var lump = (!rateSchedule && opts.lumpLine) ? cleanRec(opts.lumpLine) : null;
    var priced = price(items, rec.Margin, lump ? null : opts.targetTotal);
    if (lump) { priced.lump = lump; priced.clientTotal = round2(Number(lump.Price)); priced.vendorTotal = round2(Number(lump.Cost || 0)); priced.profit = round2(priced.clientTotal - priced.vendorTotal); }
    var doc = new jsPDFCtor({ unit: 'pt', format: 'letter', orientation: 'portrait', compress: true });
    doc.setProperties({ title: 'Olio Group Client Proposal - ' + rec.Name, author: 'Olio Group', creator: 'Olio Group Client Proposal Generator' });
    var y = 0;

    function color(c) { doc.setTextColor(c[0], c[1], c[2]); }
    function font(style, size) { doc.setFont('helvetica', style); doc.setFontSize(size); }
    function newPage() { doc.addPage(); y = TOP; }
    function ensure(h) { if (y + h > PAGE_H - BOTTOM) newPage(); }

    // Word-wrap a bold lead-in plus regular text into lines of styled words.
    function layoutRich(boldPart, normalPart, w, size) {
      var words = [];
      String(boldPart || '').split(/\s+/).filter(Boolean).forEach(function (wd) { words.push({ t: wd, b: true }); });
      String(normalPart || '').split(/\s+/).filter(Boolean).forEach(function (wd) { words.push({ t: wd, b: false }); });
      var out = [], cur = [], curW = 0;
      words.forEach(function (wd) {
        font(wd.b ? 'bold' : 'normal', size);
        var ww = doc.getTextWidth(wd.t);
        font('normal', size);
        var sp = cur.length ? doc.getTextWidth(' ') : 0;
        if (cur.length && curW + sp + ww > w) { out.push(cur); cur = []; curW = 0; sp = 0; }
        cur.push(wd); curW += sp + ww;
      });
      if (cur.length) out.push(cur);
      return out;
    }

    function drawRichLine(ln, x, baseY, size) {
      var cx = x;
      ln.forEach(function (wd, j) {
        font('normal', size);
        if (j) cx += doc.getTextWidth(' ');
        font(wd.b ? 'bold' : 'normal', size); color(BODY);
        doc.text(wd.t, cx, baseY);
        cx += doc.getTextWidth(wd.t);
      });
    }

    // Paragraph with optional bold lead-in ("Label: rest") and optional bullet.
    function para(text, o) {
      o = o || {};
      var size = o.size || 9.5, lead = o.leading || 13.5, x = o.x || LM, w = o.width || CW;
      var boldLead = '', rest = text;
      if (o.boldLead) {
        var idx = text.indexOf(':');
        if (idx > 0 && idx <= 40) { boldLead = text.slice(0, idx + 1); rest = text.slice(idx + 1); }
      }
      layoutRich(boldLead, rest, w, size).forEach(function (ln, i) {
        ensure(lead);
        if (i === 0 && o.bullet) { font('normal', size); color(BODY); doc.text('•', x - 10, y + size); }
        drawRichLine(ln, x, y + size, size);
        y += lead;
      });
      y += (o.after == null ? 2 : o.after);
    }

    // A section heading never sits alone at the bottom of a page: it keeps at least its first two lines with it.
    function band(title, keep) {
      ensure(keep == null ? 62 : keep);
      y += 9;
      doc.setFillColor(MINT[0], MINT[1], MINT[2]); doc.rect(LM, y, CW, 22, 'F');
      doc.setFillColor(GREEN[0], GREEN[1], GREEN[2]); doc.rect(LM, y, 4, 22, 'F');
      font('bold', 10.5); color(GREEN); doc.text(title, LM + 12, y + 14.5);
      y += 22 + 6;
    }

    function bullets(text) {
      lines(text).forEach(function (l) { para(l, { bullet: true, x: LM + 14, width: CW - 14, boldLead: true, size: 9, leading: 11.8, after: 1.2 }); });
    }

    // ---------- page 1 header
    y = 43;
    var logoW = 116, logoH = logoW * (opts.logoRatio || 0.5104);
    if (opts.logo) doc.addImage(opts.logo, 'JPEG', LM, y, logoW, logoH);
    font('bold', 22); color(GREEN); doc.text('Client Proposal', PAGE_W - RM, y + 22, { align: 'right' });
    font('bold', 10.5); color(BODY);
    var titleLines = doc.splitTextToSize(rec.Name || '', CW - logoW - 20);
    titleLines.forEach(function (t, i) { doc.text(t, PAGE_W - RM, y + 38 + i * 13, { align: 'right' }); });
    y += Math.max(logoH, 38 + titleLines.length * 13) + 6;
    font('normal', 8.5); color(GREEN); doc.text(TAGLINE, LM, y + 8);
    y += 16;
    doc.setDrawColor(GREEN[0], GREEN[1], GREEN[2]); doc.setLineWidth(1.5); doc.line(LM, y, PAGE_W - RM, y);
    y += 16;

    if (opts.draftLabel) {
      font('bold', 9); doc.setTextColor(192, 57, 43);
      doc.text(opts.draftLabel, PAGE_W / 2, y - 4, { align: 'center' });
      y += 8;
    }

    // ---------- detail table
    var contact = rec._contact || {};
    var contactLine = [contact.name, contact.email, MAIN_PHONE].filter(Boolean).join(' | ');
    var rev = Number(rec.Revision) || 1;
    var dateLine = longDate(rec.Prepared_Date) + (rev > 1 ? ' (Revision ' + rev + ')' : '');
    var propNo = rec.Proposal_No || '';
    var validThrough = (function () {
      var d = rec.Prepared_Date ? String(rec.Prepared_Date).slice(0, 10).split('-') : null;
      var dt = d && d.length === 3 ? new Date(+d[0], +d[1] - 1, +d[2]) : new Date();
      dt.setDate(dt.getDate() + (Number(rec.Valid_Days) || 30));
      return longDate(dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0'));
    })();
    var projLine = rec.Name + (rec.Scope_Reference ? ' (' + rec.Scope_Reference + ')' : '');
    doc.autoTable({
      startY: y, margin: { left: LM, right: RM },
      body: [
        ['Project Name / Scope Reference', projLine],
        ['Project Location', rec.Project_Location || ''],
        ['Client', rec.Client_Name || ''],
        ['Proposal No.', propNo],
        ['Prepared Date', dateLine],
        ['Valid Through', validThrough],
        ['Primary Olio Contact', contactLine]
      ],
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 9.5, textColor: BODY, lineColor: LINE, lineWidth: 0.5, cellPadding: { top: 4, bottom: 4, left: 8, right: 8 }, valign: 'middle' },
      columnStyles: { 0: { cellWidth: 151, fontStyle: 'bold', fillColor: MINT }, 1: { fillColor: WHITE } },
      didParseCell: function (d) { if (d.section === 'body' && d.row.index === 3 && d.column.index === 1) d.cell.styles.fontStyle = 'bold'; }
    });
    y = doc.lastAutoTable.finalY;

    // ---------- project summary
    band('Project Summary');
    String(rec.Project_Summary || '').split(/\n\s*\n/).map(function (p) { return p.replace(/\s*\n\s*/g, ' ').trim(); }).filter(Boolean)
      .forEach(function (p) { para(p, { after: 6 }); });

    // ---------- investment
    var soleDefault = priced.areas.length === 1 && priced.areas[0].name === 'General Scope';
    band(rateSchedule ? 'Service Rates' : 'Investment');
    para(rateSchedule ? 'Rates are per service as listed and include all labor, materials and equipment. Billing is based on the services performed.'
      : (lump ? 'The price below includes all parts, labor and equipment for the complete scope of work described in this proposal.' : 'All prices include parts, labor and equipment for each item.'), { size: 8.5, leading: 11.5, after: 6 });
    var invBody = [], rowKinds = [];
    if (lump) { invBody.push(['1', lump.Name, money(lump.Price)]); rowKinds.push('item'); }
    else priced.areas.forEach(function (a) {
      if (!(rateSchedule && soleDefault)) { invBody.push([a.code, { content: a.name, colSpan: 2 }]); rowKinds.push('area'); }
      a.items.forEach(function (it) { invBody.push([it.Item_No, it.Name, it.Included ? 'Included' : money(it.Client_Price)]); rowKinds.push('item'); });
      if (!rateSchedule && priced.areas.length > 1) { invBody.push(['', 'Area ' + a.code + ' Subtotal', money(a.subtotal)]); rowKinds.push('sub'); }
    });
    if (!rateSchedule) { invBody.push(['', 'TOTAL PROJECT INVESTMENT (ALL-INCLUSIVE)', money(priced.clientTotal)]); rowKinds.push('total'); }
    doc.autoTable({
      startY: y, margin: { left: LM, right: RM, bottom: BOTTOM, top: TOP },
      head: [['Item', rateSchedule ? 'Service' : 'Scope Item', rateSchedule ? 'Rate' : 'Price']], body: invBody, theme: 'plain',
      styles: { font: 'helvetica', fontSize: 9.5, textColor: BODY, cellPadding: { top: 4, bottom: 4, left: 8, right: 8 }, valign: 'middle' },
      headStyles: { fillColor: GREEN, textColor: WHITE, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 40 }, 2: { cellWidth: 94, halign: 'right' } },
      didParseCell: function (d) {
        if (d.section === 'head' && d.column.index === 2) d.cell.styles.halign = 'right';
        if (d.section !== 'body') return;
        var k = rowKinds[d.row.index];
        if (k === 'area') { d.cell.styles.fillColor = MINT; d.cell.styles.textColor = GREEN; d.cell.styles.fontStyle = 'bold'; d.cell.styles.fontSize = 10; }
        if (k === 'sub') { d.cell.styles.fontStyle = 'bold'; if (d.column.index === 1) d.cell.styles.halign = 'right'; }
        if (k === 'total') { d.cell.styles.fillColor = GREEN; d.cell.styles.textColor = WHITE; d.cell.styles.fontStyle = 'bold'; d.cell.styles.fontSize = 11; d.cell.styles.cellPadding = { top: 7, bottom: 7, left: 8, right: 8 }; }
      },
      didDrawCell: function (d) {
        if (d.section !== 'body') return;
        var k = rowKinds[d.row.index];
        doc.setLineWidth(0.4); doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
        if (k !== 'total') doc.line(d.cell.x, d.cell.y + d.cell.height, d.cell.x + d.cell.width, d.cell.y + d.cell.height);
        if (k === 'sub' && d.column.index > 0) { doc.setLineWidth(0.8); doc.setDrawColor(GREEN[0], GREEN[1], GREEN[2]); doc.line(d.cell.x, d.cell.y, d.cell.x + d.cell.width, d.cell.y); }
      }
    });
    y = doc.lastAutoTable.finalY;

    if (!rateSchedule && !lump && priced.areas.length > 1) {
      y += 10;
      var sumBody = priced.areas.map(function (a) { return [a.code + '. ' + a.name, money(a.subtotal)]; });
      sumBody.push(['Total Project Investment', money(priced.clientTotal)]);
      var nSum = sumBody.length;
      doc.autoTable({
        startY: y, margin: { left: LM, right: RM, bottom: BOTTOM, top: TOP }, rowPageBreak: 'avoid',
        head: [[{ content: 'Investment Summary by Area', colSpan: 2 }]], body: sumBody, theme: 'plain',
        styles: { font: 'helvetica', fontSize: 9.5, textColor: BODY, cellPadding: { top: 4, bottom: 4, left: 8, right: 8 } },
        headStyles: { fillColor: GREEN, textColor: WHITE, fontStyle: 'bold' },
        columnStyles: { 1: { cellWidth: 94, halign: 'right' } },
        didParseCell: function (d) { if (d.section === 'body' && d.row.index === nSum - 1) { d.cell.styles.fillColor = MINT; d.cell.styles.fontStyle = 'bold'; } },
        didDrawCell: function (d) {
          if (d.section !== 'body') return;
          doc.setLineWidth(0.4); doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
          doc.line(d.cell.x, d.cell.y + d.cell.height, d.cell.x + d.cell.width, d.cell.y + d.cell.height);
          if (d.row.index === nSum - 1) { doc.setLineWidth(1); doc.setDrawColor(GREEN[0], GREEN[1], GREEN[2]); doc.line(d.cell.x, d.cell.y, d.cell.x + d.cell.width, d.cell.y); }
        }
      });
      y = doc.lastAutoTable.finalY;
    }

    // ---------- scope of work
    band('Scope of Work');
    // Rate schedule with no descriptions: the list would only repeat the Service Rates table, so say so in one line.
    var bareRates = rateSchedule && !lump && priced.areas.every(function (a) { return a.items.every(function (it) { return !String(it.Description || '').trim(); }); });
    if (bareRates) para('The scope covers the services listed in the Service Rates table above.', { size: 9, leading: 12, after: 4 });
    else para(lump ? 'The following scope is included in ' + lump.Name + '.' : 'Item numbers below match the ' + (rateSchedule ? 'Service Rates' : 'Investment') + ' table.', { size: 8.5, leading: 11.5, after: 6 });
    if (!bareRates) priced.areas.forEach(function (a) {
      var SOW_SIZE = 9.5, SOW_LEAD = 13, CODE_W = 32, PAD = 4;
      var textW = CW - CODE_W - PAD * 2;
      var rich = a.items.map(function (it) { return layoutRich(it.Name + (String(it.Description || '').trim() ? '.' : ''), it.Description || '', textW, SOW_SIZE); });
      // keep the area heading with at least its first two items
      var firstRows = rich.slice(0, 2).reduce(function (s, r) { return s + r.length * SOW_LEAD + 6; }, 0);
      if ((rateSchedule && soleDefault) || (lump && priced.areas.length === 1)) { ensure(firstRows); }
      else {
        ensure(16 + firstRows);
        font('bold', 10); color(GREEN);
        var head = (priced.areas.length > 1 ? 'Area ' + a.code + ': ' : '') + a.name;
        doc.text(head, LM, y + 10); y += 16;
      }
      doc.setLineHeightFactor(SOW_LEAD / SOW_SIZE);
      doc.autoTable({
        startY: y, margin: { left: LM, right: RM, bottom: BOTTOM, top: TOP }, theme: 'plain', rowPageBreak: 'avoid',
        body: a.items.map(function (it, i) { return [it.Item_No, rich[i].map(function () { return ' '; }).join('\n')]; }),
        styles: { font: 'helvetica', fontSize: SOW_SIZE, textColor: BODY, cellPadding: { top: 2, bottom: 3, left: PAD, right: PAD }, valign: 'top' },
        columnStyles: { 0: { cellWidth: CODE_W, fontStyle: 'bold' } },
        didDrawCell: function (d) {
          if (d.section !== 'body' || d.column.index !== 1) return;
          var x = d.cell.x + PAD, top = d.cell.y + 2;
          rich[d.row.index].forEach(function (ln, k) { drawRichLine(ln, x, top + SOW_SIZE + k * SOW_LEAD + 0.6, SOW_SIZE); });
        }
      });
      doc.setLineHeightFactor(1.15);
      y = doc.lastAutoTable.finalY + 8;
    });

    // ---------- standard sections
    // The signature block never sits alone on the last page: if it will not fit after the last section,
    // that section moves to the next page with it.
    var AUTH_H = 150;
    function bulletsHeight(text) {
      return lines(text).reduce(function (h, l) {
        var idx = l.indexOf(':'), bl = idx > 0 && idx <= 40 ? l.slice(0, idx + 1) : '', rest = bl ? l.slice(idx + 1) : l;
        return h + layoutRich(bl, rest, CW - 14, 9).length * 11.8 + 1.2;
      }, 0);
    }
    SECTION_ORDER.forEach(function (s, i) {
      var text = sectionText(rec, s[0]);
      if (i === SECTION_ORDER.length - 1) {
        var secH = 37 + bulletsHeight(text), room = PAGE_H - BOTTOM - y;
        if (secH <= room && secH + AUTH_H > room && secH + AUTH_H <= PAGE_H - BOTTOM - TOP) newPage();
      }
      band(s[1]); bullets(text);
    });

    // ---------- authorization
    if (opts.onY) opts.onY(y, doc.getNumberOfPages());
    ensure(AUTH_H);
    band('Authorization', AUTH_H);
    para(rateSchedule ? 'By signing below, the client authorizes Olio Group to provide the services described in this proposal at the rates listed in the Service Rates table.'
      : 'By signing below, the client authorizes Olio Group to proceed with the scope described in this proposal for a total all-inclusive investment of ' + money(priced.clientTotal) + '.', { size: 9, leading: 12, after: 14 });
    var colW = (CW - 36) / 2, x2 = LM + colW + 36;
    font('bold', 9.5); color(BODY);
    doc.text('Client: ' + (rec.Client_Name || ''), LM, y); doc.text('Olio Group', x2, y);
    y += 26;
    // Compact two-row signature block: Signature and Date side by side, then Printed Name and Title.
    doc.setDrawColor(BODY[0], BODY[1], BODY[2]); doc.setLineWidth(0.75);
    var sigW = colW * 0.64, gap = 12;
    [LM, x2].forEach(function (cx) {
      doc.line(cx, y, cx + sigW, y); doc.line(cx + sigW + gap, y, cx + colW, y);
      font('normal', 8); color(BODY); doc.text('Signature', cx, y + 10); doc.text('Date', cx + sigW + gap, y + 10);
    });
    y += 30;
    [LM, x2].forEach(function (cx) {
      doc.line(cx, y, cx + colW, y);
      font('normal', 8); color(BODY); doc.text('Printed Name and Title', cx, y + 10);
    });
    y += 16;

    // ---------- footer on every page
    var n = doc.getNumberOfPages();
    for (var i = 1; i <= n; i++) {
      doc.setPage(i);
      doc.setDrawColor(GREEN[0], GREEN[1], GREEN[2]); doc.setLineWidth(0.75);
      doc.line(LM, PAGE_H - 44.6, PAGE_W - RM, PAGE_H - 44.6);
      font('normal', 7.5); color(BODY);
      doc.text(FOOTER, LM, PAGE_H - 32.4);
      doc.text('Page ' + i + ' of ' + n, PAGE_W - RM, PAGE_H - 32.4, { align: 'right' });
      // Every page says which proposal it belongs to, so loose or forwarded pages stay identifiable.
      var ident = [rec.Proposal_No ? 'Proposal ' + rec.Proposal_No : '', rec.Client_Name || ''].filter(Boolean).join(' | ');
      if (ident) { font('normal', 7); doc.setTextColor(120, 130, 126); doc.text(doc.splitTextToSize(ident, CW)[0], LM, PAGE_H - 22.5); }
    }
    return { doc: doc, priced: priced };
  }

  /*
   * Plain-text suggested addendum. mode 'client' lists client prices, 'vendor' lists vendor prices.
   * Reps copy what they want into the SOW's Client / Vendor Addendum.
   */
  function addendumText(priced, rec, mode) {
    var vendor = mode === 'vendor';
    rec = cleanRec(rec);
    var rev = Number(rec.Revision) || 1;
    var out = [];
    out.push((vendor ? 'VENDOR SCOPE' : 'CLIENT SCOPE') + ' - ' + (rec.Name || '') + ' (Proposal Rev ' + rev + ', ' + longDate(rec.Prepared_Date) + ')');
    if (rec.Project_Location) out.push('Location: ' + rec.Project_Location);
    out.push('');
    var rateSchedule = !!rec.Rate_Schedule;
    var multi = priced.areas.length > 1;
    if (priced.lump) {
      out.push('1 ' + priced.lump.Name + ' (' + money(vendor ? priced.vendorTotal : priced.clientTotal) + ')');
      out.push('Scope included:');
      priced.areas.forEach(function (a) {
        a.items.forEach(function (it) { var dsc = String(it.Description || '').trim(); out.push('- ' + (multi ? a.name + ': ' : '') + it.Name + (dsc ? ': ' + dsc : '')); });
      });
      out.push('');
    } else priced.areas.forEach(function (a) {
      if (multi) out.push(a.code + '. ' + a.name);
      a.items.forEach(function (it) {
        var amt = vendor ? Number(it.Vendor_Cost || 0) : it.Client_Price;
        var dsc = String(it.Description || '').trim();
        out.push(it.Item_No + ' ' + it.Name + (dsc ? ': ' + dsc : '') + ' (' + (it.Included ? 'Included' : money(amt)) + ')');
      });
      if (multi && !rateSchedule) out.push('Area ' + a.code + ' subtotal: ' + money(vendor ? a.cost : a.subtotal));
      out.push('');
    });
    if (rateSchedule) out.push('Rates are per service as listed, all-inclusive of parts and labor.');
    else out.push('TOTAL (ALL-INCLUSIVE, PARTS AND LABOR): ' + money(vendor ? priced.vendorTotal : priced.clientTotal));
    var ex = lines(sectionText(rec, 'Exclusions'));
    if (ex.length) { out.push(''); out.push('Exclusions:'); ex.forEach(function (l) { out.push('- ' + l); }); }
    return out.join('\n');
  }

  var api = {
    build: build, price: price, clientPrice: clientPrice, money: money, longDate: longDate, addendumText: addendumText,
    STANDARD_TEXT: STANDARD_TEXT, SECTION_ORDER: SECTION_ORDER,
    clean: clean,
    MARGIN_DEFAULT: MARGIN_DEFAULT, MARGIN_FLOOR_WITHOUT_APPROVAL: MARGIN_FLOOR_WITHOUT_APPROVAL
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.OlioProposal = api;
})(typeof window !== 'undefined' ? window : globalThis);
