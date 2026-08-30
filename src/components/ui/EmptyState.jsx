import { motion as Motion } from "framer-motion";

export default function EmptyState({
  title = "Нет данных",
  description = "По выбранным параметрам данные отсутствуют.",
}) {
  return (
    <Motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 text-center"
    >
      <div className="text-lg font-medium text-white">{title}</div>
      <div className="mt-2 text-sm text-zinc-400">{description}</div>
    </Motion.div>
  );
}
