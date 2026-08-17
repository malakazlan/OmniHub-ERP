/** Split salary net pay vs new advance for clearance disbursement. */
export function computeClearanceDisbursement(netPayable, newAdvanceAmount, payMode = "cash") {
  const net = Math.max(parseFloat(netPayable) || 0, 0);
  const advance = Math.max(parseFloat(newAdvanceAmount) || 0, 0);
  const total = net + advance;

  if (payMode === "bank") {
    return {
      salaryCash: 0,
      salaryBank: net,
      advanceCash: 0,
      advanceBank: advance,
      totalDisbursement: total,
    };
  }

  if (payMode === "split") {
    return {
      salaryCash: net,
      salaryBank: 0,
      advanceCash: advance,
      advanceBank: 0,
      totalDisbursement: total,
    };
  }

  return {
    salaryCash: net,
    salaryBank: 0,
    advanceCash: advance,
    advanceBank: 0,
    totalDisbursement: total,
  };
}
