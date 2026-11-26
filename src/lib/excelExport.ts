import type { Player, PracticeDay } from '../domain/types';

function triggerDownload(buffer: ArrayBuffer, filename: string): void {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function addRowsToSheet(
  sheet: import('exceljs').Worksheet,
  rows: Record<string, unknown>[]
): void {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  sheet.addRow(headers);
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  for (const row of rows) {
    sheet.addRow(headers.map((h) => row[h] ?? ''));
  }
}

export async function exportDayExcel(day: PracticeDay, players: Player[]): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;
  const playerMap = new Map(players.map((p) => [p.id, p.name]));

  const summaryRows = day.completions.map((c) => {
    const station = day.stations.find((s) => s.id === c.stationId);
    const activeBalls = day.balls.filter(
      (b) => b.stationId === c.stationId && b.playerId === c.playerId && !b.isUndone
    );
    const solidCount = activeBalls.filter((b) => b.contactOutcome === 'Solid').length;
    const solidPct = activeBalls.length > 0 ? Math.round((solidCount / activeBalls.length) * 100) : 0;

    return {
      Date: day.practiceDate,
      Player: playerMap.get(c.playerId) ?? c.playerId,
      Station: station ? `Station ${station.stationNumber} (${station.netType})` : c.stationId,
      Session: station?.sessionName ?? 'Session 1',
      'Time Slot': station ? `${station.startTime} - ${station.endTime}` : '',
      'Training Type':
        station?.trainingType === 'Other'
          ? station.customTrainingType || 'Other'
          : station?.trainingType ?? '',
      'Ball Type': station?.ballType ?? '',
      'Bowling Type': station?.bowlingType ?? '',
      Balls: activeBalls.length,
      'Solid %': `${solidPct}%`,
      Rating: `${c.rating}/10`,
      'Observing Coach': c.observingCoach,
      Remarks: c.remarks ?? '',
    };
  });

  const ballRows = day.balls
    .filter((b) => !b.isUndone)
    .map((b) => {
      const station = day.stations.find((s) => s.id === b.stationId);
      return {
        Date: day.practiceDate,
        Station: station ? `Station ${station.stationNumber}` : b.stationId,
        'Time Slot': station ? `${station.startTime} - ${station.endTime}` : '',
        Player: playerMap.get(b.playerId) ?? b.playerId,
        Ball: b.ballNumber,
        'Bowling Style': b.bowlingStyle ?? '',
        Line: b.line ?? '',
        Length: b.length ?? '',
        'Shot Type': b.shotType ?? '',
        Runs: b.runs ?? '',
        'Contact Outcome': b.contactOutcome,
        'Shot X': b.shotX ?? '',
        'Shot Y': b.shotY ?? '',
        'Logged By': b.coachName,
        Timestamp: b.createdAt,
      };
    });

  const wb = new ExcelJS.Workbook();
  const wsSummary = wb.addWorksheet('Day Summary');
  addRowsToSheet(
    wsSummary,
    summaryRows.length > 0 ? summaryRows : [{ Info: 'No completed records for this date.' }]
  );

  const wsBalls = wb.addWorksheet('Ball by Ball');
  addRowsToSheet(
    wsBalls,
    ballRows.length > 0 ? ballRows : [{ Info: 'No balls logged for this date.' }]
  );

  for (const station of day.stations) {
    const stBalls = ballRows.filter((r) => r.Station === `Station ${station.stationNumber}`);
    const wsStation = wb.addWorksheet(`Station ${station.stationNumber}`);
    addRowsToSheet(
      wsStation,
      stBalls.length > 0 ? stBalls : [{ Info: 'No balls logged at this station.' }]
    );
  }

  const buffer = await wb.xlsx.writeBuffer();
  triggerDownload(buffer, `Batting_Day_${day.practiceDate}.xlsx`);
}

export async function exportPlayerHistoryExcel(
  allDays: Record<string, PracticeDay>,
  players: Player[]
): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;
  const playerMap = new Map(players.map((p) => [p.id, p.name]));

  const allBalls: Record<string, unknown>[] = [];
  const trainingRows: Record<string, unknown>[] = [];

  for (const [date, day] of Object.entries(allDays)) {
    for (const c of day.completions) {
      const station = day.stations.find((s) => s.id === c.stationId);
      const balls = day.balls.filter(
        (b) => b.stationId === c.stationId && b.playerId === c.playerId && !b.isUndone
      );
      const solidCount = balls.filter((b) => b.contactOutcome === 'Solid').length;
      trainingRows.push({
        Date: date,
        Player: playerMap.get(c.playerId) ?? c.playerId,
        Session: station?.sessionName ?? '',
        'Time Slot': station ? `${station.startTime} - ${station.endTime}` : '',
        'Net Type': station?.netType ?? '',
        'Ball Type': station?.ballType ?? '',
        'Bowling Type': station?.bowlingType ?? '',
        Balls: balls.length,
        'Solid %': balls.length > 0 ? `${Math.round((solidCount / balls.length) * 100)}%` : '0%',
        Rating: c.rating,
        Coach: c.observingCoach,
      });
    }

    for (const b of day.balls) {
      if (b.isUndone) continue;
      const station = day.stations.find((s) => s.id === b.stationId);
      allBalls.push({
        Date: date,
        Player: playerMap.get(b.playerId) ?? b.playerId,
        'Net Type': station?.netType ?? '',
        'Bowling Style': b.bowlingStyle ?? 'Unrecorded',
        Line: b.line ?? '',
        Length: b.length ?? '',
        'Shot Type': b.shotType ?? '',
        Runs: b.runs ?? '',
        'Contact Outcome': b.contactOutcome,
        'Logged By': b.coachName,
      });
    }
  }

  const wb = new ExcelJS.Workbook();
  const wsTraining = wb.addWorksheet('Training Breakdown');
  addRowsToSheet(
    wsTraining,
    trainingRows.length > 0 ? trainingRows : [{ Info: 'No completed history.' }]
  );

  const wsBalls = wb.addWorksheet('Ball Breakdown');
  addRowsToSheet(
    wsBalls,
    allBalls.length > 0 ? allBalls : [{ Info: 'No ball history.' }]
  );

  const buffer = await wb.xlsx.writeBuffer();
  triggerDownload(buffer, 'Batting_Player_Report.xlsx');
}
