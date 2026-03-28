export default function Agents() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Agents</h1>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
        <table className="w-full text-sm">
          <thead className="text-zinc-400 border-b border-zinc-800">
            <tr>
              <th className="p-3 text-left">Host</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Last Seen</th>
            </tr>
          </thead>

          <tbody>
            <tr className="border-t border-zinc-800 hover:bg-zinc-800">
              <td className="p-3">server-01</td>
              <td className="p-3 text-green-400">Online</td>
              <td className="p-3 text-zinc-400">2 min ago</td>
            </tr>

            <tr className="border-t border-zinc-800 hover:bg-zinc-800">
              <td className="p-3">server-02</td>
              <td className="p-3 text-red-400">Offline</td>
              <td className="p-3 text-zinc-400">1 hour ago</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}