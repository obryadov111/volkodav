import { motion as Motion } from "framer-motion";

export default function ErrorState({
  title = "Ошибка загрузки",
  description = "Не удалось получить данные.",
}) {
  return (
    <Motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-6 text-center"
    >
      <div className="text-lg font-medium text-rose-300">{title}</div>
      <div className="mt-2 text-sm text-zinc-300">{description}</div>
    </Motion.div>
  );
}
