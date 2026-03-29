import Tabs from "../components/Tabs";

export default function AssetDetails() {
  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-2xl font-semibold">server-01</h1>
        <p className="text-sm text-zinc-400">192.168.1.10</p>
      </div>

      <Tabs
        tabs={[
          {
            label: "Обзор",
            content: <Overview />,
          },
          {
            label: "Проверки",
            content: <Checks />,
          },
          {
            label: "Конфигурация",
            content: <Config />,
          },
        ]}
      />
    </div>
  );
}

function Overview() {
  return (
    <div className="card p-4">
      Общее состояние сервера
    </div>
  );
}

function Checks() {
  return (
    <div className="card p-4">
      Список проверок харденинга
    </div>
  );
}

function Config() {
  return (
    <div className="card p-4">
      Конфигурации системы
    </div>
  );
}