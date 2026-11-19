import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { useTickets } from '../hooks/useTickets';
import { useOrgUsers } from '../hooks/useOrgUsers';
import { useSites } from '../hooks/useSites';
import { useAllTimeEntries } from '../hooks/useAllTimeEntries';
import { TRADE_LIST, TRADES, TradeId, inferTradeFromCategory } from '../lib/trades';
import { TradeIcon } from '../components/TradeIcon';
import { db, collection, addDoc, doc, updateDoc, Timestamp } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import {
  Calculator,
  Users,
  ClipboardCheck,
  Plus,
  CheckCircle2,
  ShieldAlert,
  Building2,
  X,
  ArrowRight,
  Clock,
} from 'lucide-react';

interface TradesProps {
  initialTrade?: TradeId;
  onNavigateTickets?: () => void;
}

export function Trades({ initialTrade, onNavigateTickets }: TradesProps) {
  const { user } = useStore();
  const { tickets } = useTickets(undefined, user?.orgCode);
  const { users: orgUsers } = useOrgUsers(user?.orgCode);
  const { sites } = useSites(user?.orgCode);
  const { entries } = useAllTimeEntries(user?.orgCode);

  const [selectedTrade, setSelectedTrade] = useState<TradeId>(initialTrade || user?.trade || 'mason');
  const [activeSection, setActiveSection] = useState<'calculators' | 'crew' | 'checklists'>('calculators');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Quick Work Order modal from Calculator or Checklist
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [orderTitle, setOrderTitle] = useState('');
  const [orderDesc, setOrderDesc] = useState('');
  const [orderSiteId, setOrderSiteId] = useState('');
  const [orderCategory, setOrderCategory] = useState('');
  const [orderPriority, setOrderPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [orderIncludeChecklist, setOrderIncludeChecklist] = useState(true);
  const [orderMaterials, setOrderMaterials] = useState<{ name: string; quantity: string; unit: string }[]>([]);
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // --- Trade Calculator States ---
  // 1. Mason
  const [masonLength, setMasonLength] = useState('24');
  const [masonHeight, setMasonHeight] = useState('8');
  const [masonUnitType, setMasonUnitType] = useState<'brick' | 'cmu8' | 'cmu12'>('cmu8');
  const [masonWaste, setMasonWaste] = useState('10');

  // 2. Framer / Carpenter
  const [frameLength, setFrameLength] = useState('32');
  const [frameHeight, setFrameHeight] = useState('9');
  const [studSpacing, setStudSpacing] = useState<'16' | '24'>('16');
  const [openings, setOpenings] = useState('2');
  const [rafterRun, setRafterRun] = useState('12');
  const [rafterPitch, setRafterPitch] = useState('6');

  // 3. HVAC
  const [hvacSqFt, setHvacSqFt] = useState('1800');
  const [hvacCeiling, setHvacCeiling] = useState('10');
  const [hvacExposure, setHvacExposure] = useState<'shaded' | 'standard' | 'sun'>('standard');

  // 4. Electrician
  const [elecWatts, setElecWatts] = useState('3600');
  const [elecVoltage, setElecVoltage] = useState<'120' | '208' | '240' | '480'>('240');
  const [elecDistance, setElecDistance] = useState('85');
  const [elecPhase, setElecPhase] = useState<'1' | '3'>('1');

  // 5. Plumber
  const [plumbRun, setPlumbRun] = useState('45');
  const [plumbSlope, setPlumbSlope] = useState<'0.125' | '0.25'>('0.25');
  const [plumbDiameter, setPlumbDiameter] = useState<'0.75' | '1' | '2' | '3' | '4'>('3');

  // 6. Welder
  const [weldLengthFt, setWeldLengthFt] = useState('40');
  const [weldPasses, setWeldPasses] = useState('2');

  // 7. Roofer
  const [roofLength, setRoofLength] = useState('60');
  const [roofWidth, setRoofWidth] = useState('35');
  const [roofPitch, setRoofPitch] = useState('4');

  // 8. IT & Network
  const [itPoEDevices, setItPoEDevices] = useState('12');
  const [itWattsPerPort, setItWattsPerPort] = useState('15.4');
  const [itRunFeet, setItRunFeet] = useState('180');

  // 9. General Trades
  const [paintSqFt, setPaintSqFt] = useState('1200');
  const [paintCoats, setPaintCoats] = useState('2');

  const trade = TRADES[selectedTrade];
  const isManagerOrDispatcher = user?.role === 'manager' || user?.role === 'dispatcher';

  const notify = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Calculations
  const masonCalc = useMemo(() => {
    const l = Math.max(0, Number(masonLength) || 0);
    const h = Math.max(0, Number(masonHeight) || 0);
    const waste = 1 + (Math.max(0, Number(masonWaste) || 0) / 100);
    const area = l * h;
    const perSqFt = masonUnitType === 'brick' ? 6.75 : 1.125; // 8x16 CMU = 0.888 sq ft => 1.125 blocks/sq ft
    const units = Math.ceil(area * perSqFt * waste);
    const mortarBags =
      masonUnitType === 'brick'
        ? Math.ceil((units / 1000) * 7)
        : masonUnitType === 'cmu8'
          ? Math.ceil(units / 30)
          : Math.ceil(units / 22);
    const sandCuFt = Math.ceil(mortarBags * 2.5);
    return { area, units, mortarBags, sandCuFt };
  }, [masonLength, masonHeight, masonUnitType, masonWaste]);

  const frameCalc = useMemo(() => {
    const l = Math.max(0, Number(frameLength) || 0);
    const h = Math.max(0, Number(frameHeight) || 0);
    const spacingIn = Number(studSpacing);
    const openCount = Math.max(0, Number(openings) || 0);
    const baseStuds = Math.ceil((l * 12) / spacingIn) + 1;
    const openingStuds = openCount * 4; // jack + king studs
    const totalStuds = baseStuds + openingStuds;
    const plateLinearFt = Math.ceil(l * 3); // double top + single bottom plate
    const sheets4x8 = Math.ceil((l * h) / 32);
    const run = Math.max(0, Number(rafterRun) || 0);
    const pitch = Math.max(0, Number(rafterPitch) || 0);
    const rise = (run * pitch) / 12;
    const rafterLen = Math.sqrt(run * run + rise * rise);
    const angleDeg = (Math.atan2(pitch, 12) * 180) / Math.PI;
    return { totalStuds, plateLinearFt, sheets4x8, rafterLen, angleDeg };
  }, [frameLength, frameHeight, studSpacing, openings, rafterRun, rafterPitch]);

  const hvacCalc = useMemo(() => {
    const sqft = Math.max(0, Number(hvacSqFt) || 0);
    const ceil = Math.max(8, Number(hvacCeiling) || 8);
    const factor = hvacExposure === 'shaded' ? 22 : hvacExposure === 'sun' ? 30 : 25;
    const heightAdj = ceil / 8;
    const btu = Math.round(sqft * factor * heightAdj);
    const tons = +(btu / 12000).toFixed(2);
    const cfm = Math.round(tons * 400);
    return { btu, tons, cfm };
  }, [hvacSqFt, hvacCeiling, hvacExposure]);

  const elecCalc = useMemo(() => {
    const watts = Math.max(0, Number(elecWatts) || 0);
    const volts = Number(elecVoltage);
    const dist = Math.max(0, Number(elecDistance) || 0);
    const amps = elecPhase === '3' ? watts / (volts * 1.732) : watts / volts;
    const breakerMin = Math.ceil(amps * 1.25);
    const standardBreakers = [15, 20, 30, 40, 50, 60, 70, 80, 100, 125, 150, 200];
    const breaker = standardBreakers.find((b) => b >= breakerMin) || breakerMin;
    const awgTable: { gauge: string; maxAmp: number; cmil: number }[] = [
      { gauge: '14 AWG', maxAmp: 15, cmil: 4110 },
      { gauge: '12 AWG', maxAmp: 20, cmil: 6530 },
      { gauge: '10 AWG', maxAmp: 30, cmil: 10380 },
      { gauge: '8 AWG', maxAmp: 50, cmil: 16510 },
      { gauge: '6 AWG', maxAmp: 65, cmil: 26240 },
      { gauge: '4 AWG', maxAmp: 85, cmil: 41740 },
      { gauge: '2 AWG', maxAmp: 115, cmil: 66360 },
      { gauge: '1/0 AWG', maxAmp: 150, cmil: 105600 },
      { gauge: '3/0 AWG', maxAmp: 200, cmil: 167800 },
    ];
    const recWire = awgTable.find((w) => w.maxAmp >= breaker) || awgTable[awgTable.length - 1];
    // Copper K = 12.9
    const vDrop = elecPhase === '3'
      ? (1.732 * 12.9 * amps * dist) / recWire.cmil
      : (2 * 12.9 * amps * dist) / recWire.cmil;
    const vDropPct = volts > 0 ? (vDrop / volts) * 100 : 0;
    return { amps: +amps.toFixed(1), breaker, gauge: recWire.gauge, vDropPct: +vDropPct.toFixed(2) };
  }, [elecWatts, elecVoltage, elecDistance, elecPhase]);

  const plumbCalc = useMemo(() => {
    const run = Math.max(0, Number(plumbRun) || 0);
    const slope = Number(plumbSlope);
    const dia = Number(plumbDiameter);
    const fallIn = +(run * slope).toFixed(2);
    // Volume in gallons = pi * r^2 * length(in) / 231
    const r = dia / 2;
    const volGal = +((Math.PI * r * r * (run * 12)) / 231).toFixed(1);
    const cleanouts = Math.max(1, Math.ceil(run / 100));
    return { fallIn, volGal, cleanouts };
  }, [plumbRun, plumbSlope, plumbDiameter]);

  const weldCalc = useMemo(() => {
    const len = Math.max(0, Number(weldLengthFt) || 0);
    const passes = Math.max(1, Number(weldPasses) || 1);
    const totalWeldFt = len * passes;
    const lbsElectrode = +(totalWeldFt * 0.18).toFixed(1);
    const shieldGasCuFt = Math.ceil(totalWeldFt * 1.4);
    return { totalWeldFt, lbsElectrode, shieldGasCuFt };
  }, [weldLengthFt, weldPasses]);

  const roofCalc = useMemo(() => {
    const l = Math.max(0, Number(roofLength) || 0);
    const w = Math.max(0, Number(roofWidth) || 0);
    const p = Math.max(0, Number(roofPitch) || 0);
    const pitchMult = Math.sqrt(1 + (p / 12) * (p / 12));
    const trueArea = Math.ceil(l * w * pitchMult * 1.1);
    const squares = +(trueArea / 100).toFixed(1);
    const bundles = Math.ceil(squares * 3);
    return { trueArea, squares, bundles };
  }, [roofLength, roofWidth, roofPitch]);

  const itCalc = useMemo(() => {
    const devices = Math.max(0, Number(itPoEDevices) || 0);
    const wPerPort = Math.max(0, Number(itWattsPerPort) || 0);
    const runFt = Math.max(0, Number(itRunFeet) || 0);
    const totalWatts = Math.ceil(devices * wPerPort);
    const upsVA = Math.ceil(totalWatts * 1.45);
    const cableBoxes = Math.ceil((devices * runFt) / 1000);
    return { totalWatts, upsVA, cableBoxes };
  }, [itPoEDevices, itWattsPerPort, itRunFeet]);

  const genCalc = useMemo(() => {
    const area = Math.max(0, Number(paintSqFt) || 0);
    const coats = Math.max(1, Number(paintCoats) || 1);
    const gallons = Math.ceil((area * coats) / 350);
    return { area, coats, gallons };
  }, [paintSqFt, paintCoats]);

  const openOrderWithEstimate = () => {
    let summary = '';
    let mats: { name: string; quantity: string; unit: string }[] = [];

    if (selectedTrade === 'mason') {
      const unitLabel = masonUnitType === 'brick' ? 'Modular Brick' : masonUnitType === 'cmu8' ? '8" CMU Block' : '12" CMU Block';
      summary = `Masonry scope (${masonCalc.area} sq ft wall): ${masonCalc.units} ${unitLabel}, ${masonCalc.mortarBags} bags mortar, ${masonCalc.sandCuFt} cu ft sand.`;
      mats = [
        { name: unitLabel, quantity: String(masonCalc.units), unit: 'pcs' },
        { name: 'Type S Mortar (80lb)', quantity: String(masonCalc.mortarBags), unit: 'bags' },
        { name: 'Masonry Sand', quantity: String(masonCalc.sandCuFt), unit: 'cu ft' },
      ];
    } else if (selectedTrade === 'framer' || selectedTrade === 'carpenter') {
      summary = `${trade.label} framing/layout (${frameLength}ft × ${frameHeight}ft @ ${studSpacing}" OC): ${frameCalc.totalStuds} studs, ${frameCalc.plateLinearFt} LF plates, ${frameCalc.sheets4x8} sheets 4×8, rafter ${frameCalc.rafterLen.toFixed(2)}ft @ ${frameCalc.angleDeg.toFixed(1)}°.`;
      mats = [
        { name: '2x4 Studs', quantity: String(frameCalc.totalStuds), unit: 'pcs' },
        { name: 'Plate Lumber', quantity: String(frameCalc.plateLinearFt), unit: 'ft' },
        { name: '4x8 Sheathing / Drywall', quantity: String(frameCalc.sheets4x8), unit: 'sheets' },
      ];
    } else if (selectedTrade === 'hvac') {
      summary = `HVAC load calculation (${hvacSqFt} sq ft, ${hvacCeiling}ft ceiling): ${hvacCalc.btu.toLocaleString()} BTU/hr (${hvacCalc.tons} Ton), ${hvacCalc.cfm} CFM required.`;
      mats = [{ name: `${Math.ceil(hvacCalc.tons)}-Ton HVAC Unit / Coil`, quantity: '1', unit: 'ea' }];
    } else if (selectedTrade === 'electrician') {
      summary = `Electrical circuit spec (${elecWatts}W @ ${elecVoltage}V ${elecPhase}Ø, ${elecDistance}ft run): ${elecCalc.amps}A load, ${elecCalc.breaker}A breaker, ${elecCalc.gauge} copper (${elecCalc.vDropPct}% drop).`;
      mats = [
        { name: `${elecCalc.gauge} Copper Conductor`, quantity: String(elecDistance), unit: 'ft' },
        { name: `${elecCalc.breaker}A Breaker`, quantity: '1', unit: 'ea' },
      ];
    } else if (selectedTrade === 'plumber') {
      summary = `Plumbing line spec (${plumbRun}ft of ${plumbDiameter}" pipe @ ${plumbSlope}"/ft slope): ${plumbCalc.fallIn}" total elevation fall, ${plumbCalc.volGal} gal pipe volume.`;
      mats = [{ name: `${plumbDiameter}" Pipe Run`, quantity: String(plumbRun), unit: 'ft' }];
    } else if (selectedTrade === 'welder') {
      summary = `Welding fabrication (${weldLengthFt}ft × ${weldPasses} passes): ${weldCalc.lbsElectrode} lbs E7018 electrodes, ${weldCalc.shieldGasCuFt} cu ft shielding gas.`;
      mats = [{ name: 'E7018 Electrodes', quantity: String(weldCalc.lbsElectrode), unit: 'lbs' }];
    } else if (selectedTrade === 'roofer') {
      summary = `Roofing takeoff (${roofCalc.trueArea} sq ft @ ${roofPitch}/12 pitch): ${roofCalc.squares} squares (${roofCalc.bundles} bundles).`;
      mats = [{ name: 'Roofing Bundles / Membrane', quantity: String(roofCalc.bundles), unit: 'bundles' }];
    } else if (selectedTrade === 'it') {
      summary = `IT PoE & cabling (${itPoEDevices} endpoints @ ${itWattsPerPort}W): ${itCalc.totalWatts}W PoE load, ${itCalc.upsVA}VA UPS, ${itCalc.cableBoxes} box(es) Cat6A.`;
      mats = [{ name: 'Cat6A Plenum (1000ft)', quantity: String(itCalc.cableBoxes), unit: 'boxes' }];
    } else {
      summary = `Surface finish estimate (${genCalc.area} sq ft, ${genCalc.coats} coats): ${genCalc.gallons} gal paint/primer.`;
      mats = [{ name: 'Interior Paint / Primer', quantity: String(genCalc.gallons), unit: 'gal' }];
    }

    setOrderTitle(`${trade.label}: ${trade.categories[0]}`);
    setOrderCategory(trade.categories[0]);
    setOrderDesc(summary);
    setOrderMaterials(mats);
    setOrderSiteId(sites[0]?.id || '');
    setOrderModalOpen(true);
  };

  const handleCreateWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !orderSiteId) {
      notify('Please select a site first.', 'error');
      return;
    }
    setSubmittingOrder(true);
    try {
      const ticketRef = await addDoc(collection(db, 'tickets'), {
        title: orderTitle.trim(),
        description: orderDesc.trim(),
        priority: orderPriority,
        status: 'open',
        trade: selectedTrade,
        category: orderCategory || trade.categories[0],
        siteId: orderSiteId,
        orgCode: user.orgCode,
        createdBy: user.uid,
        permitRequired: Boolean(trade.defaultPermit),
        materials: orderMaterials.map((m) => ({
          ...m,
          addedBy: user.displayName,
          addedAt: new Date().toISOString(),
        })),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      if (orderIncludeChecklist && isManagerOrDispatcher) {
        for (const step of trade.checklistTemplates) {
          await addDoc(collection(db, 'tasks'), {
            title: step,
            orgCode: user.orgCode,
            status: 'pending',
            trade: selectedTrade,
            assignedTo: user.uid,
            ticketId: ticketRef.id,
            siteId: orderSiteId,
            createdBy: user.uid,
            createdAt: Timestamp.now(),
          });
        }
      }

      setOrderModalOpen(false);
      notify(`${trade.label} work order created!`);
      if (onNavigateTickets) onNavigateTickets();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'tickets');
      notify('Could not create work order.', 'error');
    } finally {
      setSubmittingOrder(false);
    }
  };

  const handleAssignUserTrade = async (targetUid: string, newTrade: TradeId) => {
    if (!isManagerOrDispatcher) return;
    try {
      await updateDoc(doc(db, 'users', targetUid), { trade: newTrade });
      notify(`Updated crew trade to ${TRADES[newTrade].label}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${targetUid}`);
      notify('Failed to update crew trade.', 'error');
    }
  };

  const activeCrewIds = new Set(
    entries.filter((e) => !e.clockOut).map((e) => (e as any).userId || e.uid)
  );

  const tradeCrew = orgUsers.filter((u) => (u.trade || 'it') === selectedTrade);
  const tradeTickets = tickets.filter((t) => (t.trade || inferTradeFromCategory(t.category)) === selectedTrade);

  return (
    <div className="space-y-6 pb-12">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[3000] px-4 py-3 rounded-xl shadow-lg border text-xs font-bold flex items-center gap-2 ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-200'
              : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-200'
          }`}
        >
          <CheckCircle2 className="h-4 w-4" />
          {toast.message}
        </div>
      )}

      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Trades &amp; Field Tools
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Job-site calculators, certified crews, and QA safety checklists for every trade
          </p>
        </div>
        <button
          onClick={openOrderWithEstimate}
          className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-4 py-2.5 text-xs font-bold shadow-sm whitespace-nowrap shrink-0 active:scale-95 transition-all"
        >
          <Plus className="h-4 w-4" />
          New {trade.label} Work Order
        </button>
      </header>

      {/* Trade Selector Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {TRADE_LIST.map((t) => {
          const isSelected = t.id === selectedTrade;
          const count = tickets.filter(
            (tk) => (tk.trade || inferTradeFromCategory(tk.category)) === t.id && tk.status !== 'resolved' && tk.status !== 'closed'
          ).length;
          return (
            <button
              key={t.id}
              onClick={() => setSelectedTrade(t.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold border whitespace-nowrap shrink-0 transition-all ${
                isSelected
                  ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-neutral-900 dark:border-white shadow-sm'
                  : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 hover:border-neutral-400'
              }`}
            >
              <TradeIcon trade={t.id} className="h-3.5 w-3.5" />
              <span>{t.label}</span>
              <span className={`font-mono text-[10px] tabular-nums ${isSelected ? 'opacity-70' : 'text-neutral-400'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected Trade Summary Banner + Section Switcher */}
      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-start gap-4">
            <div className={`h-12 w-12 rounded-2xl border flex items-center justify-center shrink-0 ${trade.badgeClasses}`}>
              <TradeIcon trade={trade.id} className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-neutral-900 dark:text-white">{trade.label}</h2>
                <span className="font-mono text-xs text-neutral-400">{trade.shortCode}</span>
              </div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">{trade.description}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 tabular-nums">
                <span>{tradeTickets.length} total jobs</span>
                <span aria-hidden="true">·</span>
                <span>{tradeCrew.length} assigned crew</span>
                {trade.defaultPermit && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-amber-600 dark:text-amber-400 font-medium">{trade.defaultPermit}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl self-start">
            <button
              onClick={() => setActiveSection('calculators')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                activeSection === 'calculators'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900'
              }`}
            >
              <Calculator className="h-3.5 w-3.5" />
              Field Calculator
            </button>
            <button
              onClick={() => setActiveSection('crew')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                activeSection === 'crew'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              Crew ({tradeCrew.length})
            </button>
            <button
              onClick={() => setActiveSection('checklists')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                activeSection === 'checklists'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900'
              }`}
            >
              <ClipboardCheck className="h-3.5 w-3.5" />
              QA Checklist
            </button>
          </div>
        </div>

        {/* SECTION 1: FIELD CALCULATORS */}
        {activeSection === 'calculators' && (
          <div className="pt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-4">
              {selectedTrade === 'mason' && (
                <>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    Brick &amp; CMU Block + Mortar Estimator
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Length (ft)</label>
                      <input type="number" value={masonLength} onChange={(e) => setMasonLength(e.target.value)} className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm font-mono tabular-nums dark:text-white" />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Height (ft)</label>
                      <input type="number" value={masonHeight} onChange={(e) => setMasonHeight(e.target.value)} className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm font-mono tabular-nums dark:text-white" />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Unit Type</label>
                      <select value={masonUnitType} onChange={(e) => setMasonUnitType(e.target.value as any)} className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm dark:text-white">
                        <option value="cmu8">8&quot; CMU Block</option>
                        <option value="cmu12">12&quot; CMU Block</option>
                        <option value="brick">Modular Brick</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Waste (%)</label>
                      <input type="number" value={masonWaste} onChange={(e) => setMasonWaste(e.target.value)} className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm font-mono tabular-nums dark:text-white" />
                    </div>
                  </div>
                </>
              )}

              {(selectedTrade === 'framer' || selectedTrade === 'carpenter') && (
                <>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    Stud Framing, Sheathing &amp; Rafter Pitch Calculator
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Wall Length (ft)</label>
                      <input type="number" value={frameLength} onChange={(e) => setFrameLength(e.target.value)} className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm font-mono tabular-nums dark:text-white" />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Wall Height (ft)</label>
                      <input type="number" value={frameHeight} onChange={(e) => setFrameHeight(e.target.value)} className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm font-mono tabular-nums dark:text-white" />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Stud Spacing</label>
                      <select value={studSpacing} onChange={(e) => setStudSpacing(e.target.value as any)} className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm dark:text-white">
                        <option value="16">16&quot; On Center</option>
                        <option value="24">24&quot; On Center</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Openings (Doors/Win)</label>
                      <input type="number" value={openings} onChange={(e) => setOpenings(e.target.value)} className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm font-mono tabular-nums dark:text-white" />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Rafter Run (ft)</label>
                      <input type="number" value={rafterRun} onChange={(e) => setRafterRun(e.target.value)} className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm font-mono tabular-nums dark:text-white" />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Pitch (X / 12)</label>
                      <input type="number" value={rafterPitch} onChange={(e) => setRafterPitch(e.target.value)} className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm font-mono tabular-nums dark:text-white" />
                    </div>
                  </div>
                </>
              )}

              {selectedTrade === 'hvac' && (
                <>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    HVAC Cooling Load (BTU / Tonnage / CFM)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Zone Area (sq ft)</label>
                      <input type="number" value={hvacSqFt} onChange={(e) => setHvacSqFt(e.target.value)} className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm font-mono tabular-nums dark:text-white" />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Ceiling Height (ft)</label>
                      <input type="number" value={hvacCeiling} onChange={(e) => setHvacCeiling(e.target.value)} className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm font-mono tabular-nums dark:text-white" />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Solar / Envelope</label>
                      <select value={hvacExposure} onChange={(e) => setHvacExposure(e.target.value as any)} className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm dark:text-white">
                        <option value="shaded">Well Insulated / Shaded</option>
                        <option value="standard">Standard Commercial</option>
                        <option value="sun">High Solar / Roof Load</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {selectedTrade === 'electrician' && (
                <>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    NEC Breaker, Copper Wire Gauge &amp; Voltage Drop Calculator
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Load (Watts)</label>
                      <input type="number" value={elecWatts} onChange={(e) => setElecWatts(e.target.value)} className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm font-mono tabular-nums dark:text-white" />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Voltage</label>
                      <select value={elecVoltage} onChange={(e) => setElecVoltage(e.target.value as any)} className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm font-mono dark:text-white">
                        <option value="120">120V</option>
                        <option value="208">208V</option>
                        <option value="240">240V</option>
                        <option value="480">480V</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Phase</label>
                      <select value={elecPhase} onChange={(e) => setElecPhase(e.target.value as any)} className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm dark:text-white">
                        <option value="1">Single-Phase (1Ø)</option>
                        <option value="3">Three-Phase (3Ø)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">One-Way Run (ft)</label>
                      <input type="number" value={elecDistance} onChange={(e) => setElecDistance(e.target.value)} className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm font-mono tabular-nums dark:text-white" />
                    </div>
                  </div>
                </>
              )}

              {selectedTrade === 'plumber' && (
                <>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    Drain Grade Fall &amp; Pipe Fluid Volume Calculator
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Pipe Run (ft)</label>
                      <input type="number" value={plumbRun} onChange={(e) => setPlumbRun(e.target.value)} className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm font-mono tabular-nums dark:text-white" />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Drain Slope</label>
                      <select value={plumbSlope} onChange={(e) => setPlumbSlope(e.target.value as any)} className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm dark:text-white">
                        <option value="0.25">1/4&quot; per ft (Standard)</option>
                        <option value="0.125">1/8&quot; per ft (Large Bore)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Pipe Diameter</label>
                      <select value={plumbDiameter} onChange={(e) => setPlumbDiameter(e.target.value as any)} className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm font-mono dark:text-white">
                        <option value="0.75">3/4&quot;</option>
                        <option value="1">1&quot;</option>
                        <option value="2">2&quot;</option>
                        <option value="3">3&quot;</option>
                        <option value="4">4&quot;</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {selectedTrade === 'welder' && (
                <>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    Fillet Weld Electrode &amp; Shielding Gas Estimator
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Joint Length (ft)</label>
                      <input type="number" value={weldLengthFt} onChange={(e) => setWeldLengthFt(e.target.value)} className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm font-mono tabular-nums dark:text-white" />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Number of Passes</label>
                      <input type="number" value={weldPasses} onChange={(e) => setWeldPasses(e.target.value)} className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm font-mono tabular-nums dark:text-white" />
                    </div>
                  </div>
                </>
              )}

              {selectedTrade === 'roofer' && (
                <>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    Roofing Squares, Pitch Multiplier &amp; Bundle Takeoff
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Footprint Len (ft)</label>
                      <input type="number" value={roofLength} onChange={(e) => setRoofLength(e.target.value)} className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm font-mono tabular-nums dark:text-white" />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Footprint Width (ft)</label>
                      <input type="number" value={roofWidth} onChange={(e) => setRoofWidth(e.target.value)} className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm font-mono tabular-nums dark:text-white" />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Pitch (/12)</label>
                      <input type="number" value={roofPitch} onChange={(e) => setRoofPitch(e.target.value)} className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm font-mono tabular-nums dark:text-white" />
                    </div>
                  </div>
                </>
              )}

              {selectedTrade === 'it' && (
                <>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    PoE Switch Power Budget &amp; Cat6A Spool Estimator
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Endpoints</label>
                      <input type="number" value={itPoEDevices} onChange={(e) => setItPoEDevices(e.target.value)} className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm font-mono tabular-nums dark:text-white" />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Watts / Port</label>
                      <select value={itWattsPerPort} onChange={(e) => setItWattsPerPort(e.target.value)} className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm font-mono dark:text-white">
                        <option value="15.4">15.4W (PoE 802.3af)</option>
                        <option value="30">30W (PoE+ 802.3at)</option>
                        <option value="60">60W (PoE++ 802.3bt)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Avg Run (ft)</label>
                      <input type="number" value={itRunFeet} onChange={(e) => setItRunFeet(e.target.value)} className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm font-mono tabular-nums dark:text-white" />
                    </div>
                  </div>
                </>
              )}

              {selectedTrade === 'general' && (
                <>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    Surface Coverage &amp; Coating Estimator
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Wall Area (sq ft)</label>
                      <input type="number" value={paintSqFt} onChange={(e) => setPaintSqFt(e.target.value)} className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm font-mono tabular-nums dark:text-white" />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Coats</label>
                      <input type="number" value={paintCoats} onChange={(e) => setPaintCoats(e.target.value)} className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm font-mono tabular-nums dark:text-white" />
                    </div>
                  </div>
                </>
              )}

              {/* Common Materials Reference */}
              <div className="pt-2">
                <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2">
                  Standard {trade.label} Materials
                </p>
                <div className="flex flex-wrap gap-2 text-xs text-neutral-600 dark:text-neutral-300">
                  {trade.commonMaterials.map((mat, i) => (
                    <span key={mat}>
                      {mat}
                      {i < trade.commonMaterials.length - 1 && <span className="ml-2 text-neutral-300 dark:text-neutral-700">·</span>}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Calculator Output Panel */}
            <div className="lg:col-span-5 rounded-2xl bg-neutral-900 dark:bg-neutral-950 text-white p-5 flex flex-col justify-between border border-neutral-800">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-3">
                  Calculated Field Output
                </p>

                {selectedTrade === 'mason' && (
                  <div className="grid grid-cols-2 gap-4 font-mono tabular-nums">
                    <div>
                      <p className="text-xs text-neutral-400">Units Needed</p>
                      <p className="text-2xl font-bold">{masonCalc.units.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-400">80lb Mortar Bags</p>
                      <p className="text-2xl font-bold">{masonCalc.mortarBags}</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-400">Wall Area</p>
                      <p className="text-lg font-bold">{masonCalc.area} sq ft</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-400">Masonry Sand</p>
                      <p className="text-lg font-bold">{masonCalc.sandCuFt} cu ft</p>
                    </div>
                  </div>
                )}

                {(selectedTrade === 'framer' || selectedTrade === 'carpenter') && (
                  <div className="grid grid-cols-2 gap-4 font-mono tabular-nums">
                    <div>
                      <p className="text-xs text-neutral-400">Total Studs</p>
                      <p className="text-2xl font-bold">{frameCalc.totalStuds} pcs</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-400">4×8 Sheets</p>
                      <p className="text-2xl font-bold">{frameCalc.sheets4x8}</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-400">Plate Lumber</p>
                      <p className="text-lg font-bold">{frameCalc.plateLinearFt} LF</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-400">Rafter / Angle</p>
                      <p className="text-lg font-bold">{frameCalc.rafterLen.toFixed(1)}ft · {frameCalc.angleDeg.toFixed(1)}°</p>
                    </div>
                  </div>
                )}

                {selectedTrade === 'hvac' && (
                  <div className="grid grid-cols-2 gap-4 font-mono tabular-nums">
                    <div>
                      <p className="text-xs text-neutral-400">Cooling Capacity</p>
                      <p className="text-2xl font-bold">{hvacCalc.tons} Tons</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-400">Required Airflow</p>
                      <p className="text-2xl font-bold">{hvacCalc.cfm.toLocaleString()} CFM</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-neutral-400">Sensible + Latent Load</p>
                      <p className="text-lg font-bold">{hvacCalc.btu.toLocaleString()} BTU/hr</p>
                    </div>
                  </div>
                )}

                {selectedTrade === 'electrician' && (
                  <div className="grid grid-cols-2 gap-4 font-mono tabular-nums">
                    <div>
                      <p className="text-xs text-neutral-400">Recommended Wire</p>
                      <p className="text-2xl font-bold">{elecCalc.gauge}</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-400">Min Breaker</p>
                      <p className="text-2xl font-bold">{elecCalc.breaker}A</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-400">Load Current</p>
                      <p className="text-lg font-bold">{elecCalc.amps} A</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-400">Voltage Drop</p>
                      <p className={`text-lg font-bold ${elecCalc.vDropPct > 3 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {elecCalc.vDropPct}%
                      </p>
                    </div>
                  </div>
                )}

                {selectedTrade === 'plumber' && (
                  <div className="grid grid-cols-2 gap-4 font-mono tabular-nums">
                    <div>
                      <p className="text-xs text-neutral-400">Total Fall / Drop</p>
                      <p className="text-2xl font-bold">{plumbCalc.fallIn}&quot;</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-400">Fluid Volume</p>
                      <p className="text-2xl font-bold">{plumbCalc.volGal} gal</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-neutral-400">Cleanouts Recommended</p>
                      <p className="text-lg font-bold">{plumbCalc.cleanouts} access point(s)</p>
                    </div>
                  </div>
                )}

                {selectedTrade === 'welder' && (
                  <div className="grid grid-cols-2 gap-4 font-mono tabular-nums">
                    <div>
                      <p className="text-xs text-neutral-400">E7018 Electrodes</p>
                      <p className="text-2xl font-bold">{weldCalc.lbsElectrode} lbs</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-400">Shield Gas</p>
                      <p className="text-2xl font-bold">{weldCalc.shieldGasCuFt} cf</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-neutral-400">Total Pass Length</p>
                      <p className="text-lg font-bold">{weldCalc.totalWeldFt} LF</p>
                    </div>
                  </div>
                )}

                {selectedTrade === 'roofer' && (
                  <div className="grid grid-cols-2 gap-4 font-mono tabular-nums">
                    <div>
                      <p className="text-xs text-neutral-400">Roofing Squares</p>
                      <p className="text-2xl font-bold">{roofCalc.squares} sq</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-400">Bundles (incl. 10%)</p>
                      <p className="text-2xl font-bold">{roofCalc.bundles}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-neutral-400">True Slope Surface</p>
                      <p className="text-lg font-bold">{roofCalc.trueArea.toLocaleString()} sq ft</p>
                    </div>
                  </div>
                )}

                {selectedTrade === 'it' && (
                  <div className="grid grid-cols-2 gap-4 font-mono tabular-nums">
                    <div>
                      <p className="text-xs text-neutral-400">Total PoE Draw</p>
                      <p className="text-2xl font-bold">{itCalc.totalWatts} W</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-400">Rec. UPS Rating</p>
                      <p className="text-2xl font-bold">{itCalc.upsVA} VA</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-neutral-400">1000ft Cat6A Boxes</p>
                      <p className="text-lg font-bold">{itCalc.cableBoxes} box(es)</p>
                    </div>
                  </div>
                )}

                {selectedTrade === 'general' && (
                  <div className="grid grid-cols-2 gap-4 font-mono tabular-nums">
                    <div>
                      <p className="text-xs text-neutral-400">Paint / Primer</p>
                      <p className="text-2xl font-bold">{genCalc.gallons} gal</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-400">Total Coverage</p>
                      <p className="text-2xl font-bold">{(genCalc.area * genCalc.coats).toLocaleString()} sq ft</p>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={openOrderWithEstimate}
                className="mt-6 w-full py-3 px-4 rounded-xl bg-white text-neutral-900 text-xs font-bold flex items-center justify-center gap-2 hover:bg-neutral-100 active:scale-[0.98] transition-all"
              >
                Create Work Order from Estimate
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* SECTION 2: TRADE CREW ROSTER */}
        {activeSection === 'crew' && (
          <div className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Showing {tradeCrew.length} crew member(s) assigned to {trade.label} in {user?.orgCode}
              </p>
            </div>

            {tradeCrew.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 p-8 text-center">
                <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                  No crew members currently tagged as {trade.label}.
                </p>
                <p className="text-xs text-neutral-400 mt-1">
                  Team members can set their primary trade in Account Settings, or managers can assign trades below.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {tradeCrew.map((member) => {
                  const isOnClock = activeCrewIds.has(member.uid);
                  const memberJobs = tickets.filter(
                    (t) => t.assignedTo === member.uid && t.status !== 'resolved' && t.status !== 'closed'
                  ).length;
                  return (
                    <div
                      key={member.uid}
                      className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/70 dark:border-neutral-800 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center font-bold text-sm shrink-0">
                          {member.displayName?.[0] || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-neutral-900 dark:text-white truncate">{member.displayName}</p>
                          <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 tabular-nums">
                            <span className="capitalize">{member.role}</span>
                            <span aria-hidden="true">·</span>
                            <span className={isOnClock ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : ''}>
                              {isOnClock ? 'On Clock' : 'Off Duty'}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{memberJobs} open jobs</span>
                          </div>
                        </div>
                      </div>

                      {isManagerOrDispatcher && (
                        <select
                          value={member.trade || 'it'}
                          onChange={(e) => handleAssignUserTrade(member.uid, e.target.value as TradeId)}
                          className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2.5 py-1.5 text-xs font-medium dark:text-white"
                          aria-label={`Change trade for ${member.displayName}`}
                        >
                          {TRADE_LIST.map((t) => (
                            <option key={t.id} value={t.id}>{t.label}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {isManagerOrDispatcher && orgUsers.length > 0 && (
              <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">
                  Reassign Organization Crew Trades
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-neutral-100 dark:border-neutral-800 text-neutral-400">
                        <th className="py-2 pr-4 font-bold">Crew Member</th>
                        <th className="py-2 pr-4 font-bold">Role</th>
                        <th className="py-2 pr-4 font-bold">Primary Trade</th>
                        <th className="py-2 font-bold text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                      {orgUsers.map((u) => (
                        <tr key={u.uid}>
                          <td className="py-2.5 pr-4 font-semibold text-neutral-900 dark:text-white">{u.displayName}</td>
                          <td className="py-2.5 pr-4 capitalize text-neutral-500">{u.role}</td>
                          <td className="py-2.5 pr-4">
                            <select
                              value={u.trade || 'it'}
                              onChange={(e) => handleAssignUserTrade(u.uid, e.target.value as TradeId)}
                              className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-2 py-1 text-xs dark:text-white"
                            >
                              {TRADE_LIST.map((t) => (
                                <option key={t.id} value={t.id}>{t.label}</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2.5 text-right tabular-nums text-neutral-500">
                            {activeCrewIds.has(u.uid) ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                                <Clock className="h-3 w-3" /> On Clock
                              </span>
                            ) : (
                              'Off Duty'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SECTION 3: CHECKLISTS & CERTIFICATIONS */}
        {activeSection === 'checklists' && (
          <div className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                Standard {trade.label} Field Checklist
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Automatically attached when dispatching {trade.label} work orders.
              </p>
              <div className="space-y-2 pt-1">
                {trade.checklistTemplates.map((step, idx) => (
                  <div
                    key={step}
                    className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/70 dark:border-neutral-800 text-xs font-medium text-neutral-800 dark:text-neutral-200"
                  >
                    <span className="font-mono text-[11px] font-bold text-neutral-400 tabular-nums">
                      0{idx + 1}
                    </span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Required Certifications &amp; Categories
                </h3>
                <div className="mt-3 space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Work Categories</p>
                  <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                    {trade.categories.join(' · ')}
                  </p>
                </div>
                <div className="mt-4 space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Recognized Licenses &amp; Certs</p>
                  <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                    {trade.certifications.join(' · ')}
                  </p>
                </div>
              </div>

              {trade.defaultPermit && (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-start gap-3">
                  <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-amber-900 dark:text-amber-200">Permit &amp; Safety Protocol</p>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                      {trade.defaultPermit} required prior to sign-off.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Create Work Order Modal */}
      {orderModalOpen && (
        <div className="fixed inset-0 z-[2500] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-neutral-900 p-6 shadow-2xl border border-neutral-100 dark:border-neutral-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                Create {trade.label} Work Order
              </h2>
              <button onClick={() => setOrderModalOpen(false)} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800">
                <X className="h-5 w-5 text-neutral-400" />
              </button>
            </div>
            <form onSubmit={handleCreateWorkOrder} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">Work Order Title</label>
                <input
                  required
                  value={orderTitle}
                  onChange={(e) => setOrderTitle(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3.5 py-2.5 text-sm dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">Category</label>
                  <select
                    value={orderCategory}
                    onChange={(e) => setOrderCategory(e.target.value)}
                    className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm dark:text-white"
                  >
                    {trade.categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">Priority</label>
                  <select
                    value={orderPriority}
                    onChange={(e) => setOrderPriority(e.target.value as any)}
                    className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm dark:text-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">Job Site</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <select
                    required
                    value={orderSiteId}
                    onChange={(e) => setOrderSiteId(e.target.value)}
                    className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 pl-9 pr-3 py-2.5 text-sm dark:text-white"
                  >
                    <option value="">Select Job Site</option>
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">Scope &amp; Calculation Notes</label>
                <textarea
                  required
                  rows={3}
                  value={orderDesc}
                  onChange={(e) => setOrderDesc(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3.5 py-2.5 text-sm dark:text-white"
                />
              </div>

              {orderMaterials.length > 0 && (
                <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200 dark:border-neutral-700 space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Attached Material Estimate</p>
                  {orderMaterials.map((m, idx) => (
                    <p key={idx} className="text-xs font-mono text-neutral-700 dark:text-neutral-200 tabular-nums">
                      {m.quantity} {m.unit} · {m.name}
                    </p>
                  ))}
                </div>
              )}

              {isManagerOrDispatcher && (
                <label className="flex items-center gap-2 text-xs font-medium text-neutral-600 dark:text-neutral-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={orderIncludeChecklist}
                    onChange={(e) => setOrderIncludeChecklist(e.target.checked)}
                    className="rounded border-neutral-300"
                  />
                  Auto-attach {trade.label} safety &amp; QA checklist ({trade.checklistTemplates.length} steps)
                </label>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOrderModalOpen(false)}
                  className="flex-1 rounded-xl bg-neutral-100 dark:bg-neutral-800 py-3 text-xs font-bold text-neutral-600 dark:text-neutral-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingOrder}
                  className="flex-1 rounded-xl bg-neutral-900 dark:bg-white py-3 text-xs font-bold text-white dark:text-neutral-900 disabled:opacity-50"
                >
                  {submittingOrder ? 'Creating...' : 'Create Work Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
