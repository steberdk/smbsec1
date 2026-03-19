"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type ActionResponse = {
  ok?: boolean;
  error?: string;
  template_type?: string | null;
  template_id?: string | null;
  checklist_item_id?: string | null;
};

/** Educational content for different template types / specific templates */
function getEducationalContent(
  templateType: string | null,
  templateId: string | null,
  checklistItemId: string | null
): { title: string; intro: string; tips: { heading: string; body: string }[] } {
  // Knowledge test templates have topic-specific education
  if (templateType === "knowledge_test") {
    if (templateId === "knowledge-password-sharing" || checklistItemId === "acct-password-manager") {
      return {
        title: "This Was a Security Knowledge Test",
        intro:
          "You clicked on a link to a shared password document. In real life, sharing passwords in documents or spreadsheets is a serious security risk. If this had been a real shared password file, anyone with access could compromise all listed accounts.",
        tips: [
          {
            heading: "Never use shared password documents.",
            body: "Spreadsheets, text files, and shared documents are not secure ways to store passwords. They can be accessed by unauthorised people, leaked, or stolen.",
          },
          {
            heading: "Use a password manager instead.",
            body: "Password managers like Bitwarden, 1Password, or KeePass encrypt your passwords and let you share them securely with team members who need access.",
          },
          {
            heading: "Each person should have their own credentials.",
            body: "Shared accounts make it impossible to track who did what. Use individual accounts with role-based access instead.",
          },
          {
            heading: "Report suspicious password-sharing requests.",
            body: "If someone asks you to use a shared password document, suggest switching to a password manager and report the practice to IT.",
          },
        ],
      };
    }

    if (templateId === "knowledge-mfa-reset" || checklistItemId === "acct-enable-mfa-email") {
      return {
        title: "This Was a Security Knowledge Test",
        intro:
          "You clicked on a link claiming your MFA was disabled for maintenance. Legitimate IT teams will never ask you to re-enable MFA through an email link. If this had been a real attack, clicking could have exposed your login credentials on a fake portal.",
        tips: [
          {
            heading: "MFA is never disabled by email.",
            body: "Your IT team will not disable MFA through email notifications. If you receive such a message, it is almost certainly a social engineering attempt.",
          },
          {
            heading: "Verify through official channels.",
            body: "If you receive a message about MFA changes, contact your IT team directly through known channels (phone, internal chat) before clicking any links.",
          },
          {
            heading: "Keep MFA enabled at all times.",
            body: "Multi-factor authentication blocks most account takeovers even when passwords are compromised. Never disable it unless explicitly instructed by IT in person.",
          },
          {
            heading: "Watch for urgency and deadlines.",
            body: "Phrases like \"within 48 hours\" or \"account will be restricted\" are pressure tactics. Real IT maintenance does not threaten account restrictions via email.",
          },
        ],
      };
    }

    if (templateId === "knowledge-macro-document" || checklistItemId === "email-disable-macros") {
      return {
        title: "This Was a Security Knowledge Test",
        intro:
          "You clicked on a link to download a document that asked you to enable macros. Malicious macros in Office documents are one of the most common ways malware is delivered. If this had been a real attack, enabling macros could have installed ransomware or other malware on your computer.",
        tips: [
          {
            heading: "Never enable macros in unexpected documents.",
            body: "Macros are small programs embedded in Office documents. Attackers use them to run malware. If a document asks you to \"Enable Content\" or \"Enable Macros,\" be very suspicious.",
          },
          {
            heading: "Verify the sender before opening attachments.",
            body: "Even if the email appears to come from a colleague, verify through a separate channel (phone, chat) that they actually sent it.",
          },
          {
            heading: "Your IT team should block macros by default.",
            body: "Ask your IT administrator to disable macros by default in Office settings. Only signed or explicitly trusted macros should be allowed.",
          },
          {
            heading: "Report documents requesting macros.",
            body: "If you receive an unexpected document asking you to enable macros, do not open it. Report it to your IT team immediately.",
          },
        ],
      };
    }

    // Generic knowledge test fallback
    return {
      title: "This Was a Security Knowledge Test",
      intro:
        "You interacted with a simulated security test. This was an exercise to help you recognise potential security risks in everyday work emails. No real threat was involved.",
      tips: [
        {
          heading: "Think before you click.",
          body: "Always pause and consider whether an email or request is legitimate before clicking links or opening attachments.",
        },
        {
          heading: "Verify through separate channels.",
          body: "If a request seems unusual, verify it by contacting the sender through a known phone number or internal chat.",
        },
        {
          heading: "Follow your organisation's security policies.",
          body: "Your security checklist covers the most important protections. Review it regularly.",
        },
        {
          heading: "When in doubt, report it.",
          body: "Use your organisation's reporting process or contact your IT team before taking action on suspicious messages.",
        },
      ],
    };
  }

  // Default phishing simulation content (existing behaviour)
  return {
    title: "This Was a Simulated Phishing Test",
    intro:
      "You clicked on a link in a simulated phishing email. Do not worry \u2014 this was a security awareness exercise, and no real threat was involved. However, if this had been a real attack, clicking could have compromised your credentials or installed malware.",
    tips: [
      {
        heading: "Check the sender address.",
        body: "Phishing emails often come from addresses that look similar to real ones but contain subtle misspellings (e.g. \"acc0unt-verify.net\").",
      },
      {
        heading: "Look for urgency and threats.",
        body: "Phrases like \"your account will be deactivated\" or \"act within 24 hours\" are designed to make you panic.",
      },
      {
        heading: "Hover over links before clicking.",
        body: "Check whether the URL actually goes to your company's legitimate domain.",
      },
      {
        heading: "When in doubt, report it.",
        body: "Use your organisation's reporting process or contact your IT team before clicking anything suspicious.",
      },
    ],
  };
}

export default function CampaignClickPage() {
  const params = useParams();
  const token = params.token as string;

  const [recorded, setRecorded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templateType, setTemplateType] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [checklistItemId, setChecklistItemId] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Security Simulation | SMB Security Quick-Check";
  }, []);

  useEffect(() => {
    if (!token) return;

    fetch("/api/campaigns/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, action: "clicked" }),
    })
      .then((res) => res.json())
      .then((data: ActionResponse) => {
        if (data.ok) {
          setRecorded(true);
          setTemplateType(data.template_type ?? null);
          setTemplateId(data.template_id ?? null);
          setChecklistItemId(data.checklist_item_id ?? null);
        } else {
          setError(data.error ?? "Something went wrong");
        }
      })
      .catch(() => setError("Failed to connect to server"));
  }, [token]);

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      </main>
    );
  }

  if (!recorded) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <p className="text-sm text-gray-600">Loading...</p>
        </div>
      </main>
    );
  }

  const content = getEducationalContent(templateType, templateId, checklistItemId);
  const isKnowledgeTest = templateType === "knowledge_test";
  const headerBg = isKnowledgeTest ? "bg-blue-600" : "bg-amber-500";

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Header bar */}
        <div className={`${headerBg} px-6 py-4`}>
          <h1 className="text-white text-lg font-bold">
            {content.title}
          </h1>
        </div>

        <div className="px-6 py-6 space-y-5">
          <p className="text-gray-700">{content.intro}</p>

          <div className={`rounded-xl border px-5 py-4 ${
            isKnowledgeTest
              ? "border-blue-200 bg-blue-50"
              : "border-teal-200 bg-teal-50"
          }`}>
            <h2 className={`text-sm font-bold mb-3 ${
              isKnowledgeTest ? "text-blue-800" : "text-teal-800"
            }`}>
              {isKnowledgeTest ? "What You Should Know" : "How to Spot Phishing Emails"}
            </h2>
            <ul className="space-y-2 text-sm">
              {content.tips.map((tip, i) => (
                <li key={i} className="flex gap-2">
                  <span className={`shrink-0 font-bold ${
                    isKnowledgeTest ? "text-blue-600" : "text-teal-600"
                  }`}>
                    {i + 1}.
                  </span>
                  <span className={isKnowledgeTest ? "text-blue-900" : "text-teal-900"}>
                    <strong>{tip.heading}</strong> {tip.body}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-gray-100 pt-4 flex flex-col sm:flex-row gap-3 items-center justify-center">
            <Link
              href="/workspace"
              className="inline-block bg-teal-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-teal-700 transition-colors"
            >
              Go to your workspace
            </Link>
            <Link
              href="/checklist"
              className="inline-block text-teal-700 hover:underline text-sm font-medium"
            >
              Review the security checklist
            </Link>
          </div>

          <p className="text-xs text-gray-400 text-center">
            This simulation is part of your organisation&apos;s security
            awareness programme, powered by SMB Security Quick-Check.
          </p>
        </div>
      </div>
    </main>
  );
}
