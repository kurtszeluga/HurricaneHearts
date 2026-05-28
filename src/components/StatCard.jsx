import { motion } from "framer-motion";

export default function StatCard({ title, value, onClick }) {
  const clickable = typeof onClick === "function";

  return (
    <motion.button
      type="button"
      whileHover={clickable ? { y: -2 } : undefined}
      onClick={onClick}
      disabled={!clickable}
      className={
        clickable
          ? "bg-white border border-gray-200 rounded-lg shadow-sm p-3 text-left hover:border-red-300 hover:bg-red-50 transition cursor-pointer"
          : "bg-white border border-gray-200 rounded-lg shadow-sm p-3 text-left"
      }
    >
      <div className="text-xs text-[#667085] mb-1 leading-tight">{title}</div>
      <div className="text-2xl font-bold text-[#172033] leading-none">{value}</div>
    </motion.button>
  );
}