"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { fetchApi } from "@/lib/api-client";
import { Button } from "@/components/ui";

export default function LiveExamsAdminPage() {
  const { getToken } = useAuth();
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [duration, setDuration] = useState("60");
  const [questionIds, setQuestionIds] = useState("");
  const [isPublished, setIsPublished] = useState(false);

  useEffect(() => {
    loadExams();
  }, [getToken]);

  const loadExams = async () => {
    try {
      const token = await getToken({ template: "supabase" });
      const data = await fetchApi("/admin/live-exams", {}, token);
      setExams(data.exams || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: any) => {
    e.preventDefault();
    try {
      const token = await getToken({ template: "supabase" });
      const qIds = questionIds.split(",").map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      
      await fetchApi("/admin/live-exams", {
        method: "POST",
        body: JSON.stringify({
          title,
          description,
          start_time: new Date(startTime).toISOString(),
          end_time: new Date(endTime).toISOString(),
          duration_minutes: parseInt(duration),
          question_ids: qIds,
          is_published: isPublished
        })
      }, token);
      
      // Reset form
      setTitle(""); setDescription(""); setStartTime(""); setEndTime(""); setDuration("60"); setQuestionIds("");
      loadExams();
    } catch (e) {
      alert("Failed to create live exam");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      const token = await getToken({ template: "supabase" });
      await fetchApi(`/admin/live-exams/${id}`, { method: "DELETE" }, token);
      loadExams();
    } catch (e) {
      alert("Failed to delete exam");
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="container-page py-8">
      <h1 className="h-display text-2xl mb-6">Schedule Live Exam</h1>
      
      <form onSubmit={handleCreate} className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 mb-10 flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="w-full border rounded-lg p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description (Optional)</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full border rounded-lg p-2" rows={2} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Start Time</label>
            <input type="datetime-local" required value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full border rounded-lg p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Time (Deadline)</label>
            <input type="datetime-local" required value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full border rounded-lg p-2" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Duration (minutes)</label>
            <input type="number" required min="1" value={duration} onChange={e => setDuration(e.target.value)} className="w-full border rounded-lg p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Question IDs (comma separated)</label>
            <input type="text" required placeholder="e.g. 101, 105, 210" value={questionIds} onChange={e => setQuestionIds(e.target.value)} className="w-full border rounded-lg p-2" />
          </div>
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={isPublished} onChange={e => setIsPublished(e.target.checked)} />
          <span className="text-sm font-medium">Publish immediately</span>
        </label>
        
        <Button type="submit" className="self-start mt-2">Schedule Exam</Button>
      </form>

      <h2 className="text-xl font-bold mb-4">Existing Scheduled Exams</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-100 uppercase text-stone-600">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Start</th>
              <th className="px-4 py-3">End</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Questions</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200 bg-white">
            {exams.map((ex) => (
              <tr key={ex.id}>
                <td className="px-4 py-3 font-medium">{ex.title}</td>
                <td className="px-4 py-3">{new Date(ex.start_time).toLocaleString()}</td>
                <td className="px-4 py-3">{new Date(ex.end_time).toLocaleString()}</td>
                <td className="px-4 py-3">{ex.is_published ? "Published" : "Draft"}</td>
                <td className="px-4 py-3">{ex.question_ids?.length || 0}</td>
                <td className="px-4 py-3">
                  <button onClick={() => handleDelete(ex.id)} className="text-red-500 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
