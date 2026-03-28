export default function Project() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Infrastructure</h1>

      <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-zinc-400 border-b border-zinc-800">
            <tr>
              <th className="text-left p-3">Server</th>
              <th className="text-left p-3">IP</th>
              <th className="text-left p-3">Status</th>
            </tr>
          </thead>

          <tbody>
            <tr className="border-t border-zinc-800 hover:bg-zinc-800">
              <td className="p-3">web-01</td>
              <td className="p-3">192.168.0.1</td>
              <td className="p-3">
                <span className="px-2 py-1 text-xs rounded bg-green-500/10 text-green-400">
                  OK
                </span>
              </td>
            </tr>

            <tr className="border-t border-zinc-800 hover:bg-zinc-800">
              <td className="p-3">db-01</td>
              <td className="p-3">192.168.0.2</td>
              <td className="p-3">
                <span className="px-2 py-1 text-xs rounded bg-red-500/10 text-red-400">
                  Issue
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}