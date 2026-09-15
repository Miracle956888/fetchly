import { listQuizzes } from "@/services/admin.service";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, Td, Th, Tr, THead } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { BarChart3 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminQuizzesPage() {
  const quizzes = await listQuizzes();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Quizzes</h1>
        <p className="mt-1 text-[14px] text-ink-500">
          Assessment content across the catalog, with usage statistics.
        </p>
      </div>

      {quizzes.length === 0 ? (
        <EmptyState icon={BarChart3} title="No quizzes yet" description="Quizzes attached to lessons will be listed here with attempt statistics." />
      ) : (
        <Table>
          <THead>
            <Th>Quiz</Th>
            <Th>Course</Th>
            <Th>Questions</Th>
            <Th>Attempts</Th>
            <Th>Passing score</Th>
            <Th>State</Th>
          </THead>
          <TBody>
            {quizzes.map((q) => (
              <Tr key={q.id}>
                <Td>
                  <span className="font-medium text-ink-900">{q.title}</span>
                </Td>
                <Td>{q.courseTitle}</Td>
                <Td>{q.questionCount}</Td>
                <Td>{q.attemptCount}</Td>
                <Td>{q.passingScore}%</Td>
                <Td>
                  <Badge variant={q.isActive ? "success" : "neutral"}>{q.isActive ? "active" : "inactive"}</Badge>
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
