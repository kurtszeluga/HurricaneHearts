export function isOpenRequestStatus(status) {
  return status === "Open" || status === "Re-Opened";
}

export function getRequestStatusClass(status) {
  if (status === "Re-Opened") {
    return "bg-[#fef3c7] text-[#92400e] border border-[#fde68a]";
  }

  return "bg-[#f2f4f7] text-[#344054]";
}
