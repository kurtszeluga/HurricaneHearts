const TERMS_VERSION = "1.0";

export default function TermsAndConditions({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Terms and Conditions</h2>
            <p className="text-sm text-gray-500">Version {TERMS_VERSION}</p>
          </div>

          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 font-semibold">
            Close
          </button>
        </div>

        <div className="p-6 overflow-y-auto text-sm text-gray-700 leading-6 space-y-4">
          <p>
            PLACE YOUR TERMS AND CONDITIONS TEXT HERE.
          </p>

          <p>
            This section should explain the purpose of Hurricane Hearts, user responsibilities,
            privacy expectations, limitations of emergency assistance, and any community rules
            that residents must agree to before using the system.
          </p>

          <h3 className="font-bold text-lg text-gray-900">Suggested Sections</h3>

          <ol className="list-decimal pl-6 space-y-2">
            <li>Purpose of the Hurricane Hearts system</li>
            <li>Eligibility and resident participation</li>
            <li>Accuracy of contact and profile information</li>
            <li>Acceptable use of resident contact information</li>
            <li>Volunteer/helper limitations and no guarantee of assistance</li>
            <li>Emergency disclaimer: call 911 for life-threatening emergencies</li>
            <li>Privacy and information sharing within the community</li>
            <li>Admin approval, deactivation, and account removal</li>
            <li>Changes to these terms</li>
          </ol>

          <h3 className="font-bold text-lg text-gray-900">Emergency Disclaimer Placeholder</h3>
          <p>
            Hurricane Hearts is a community coordination tool and is not a replacement for 911,
            emergency medical services, law enforcement, fire rescue, or official emergency
            management services. In a life-threatening emergency, users should call 911 immediately.
          </p>

          <h3 className="font-bold text-lg text-gray-900">Contact Information Use Placeholder</h3>
          <p>
            Users agree to use resident contact information only for appropriate Hurricane Hearts
            assistance, coordination, safety, and community support purposes. Users may not misuse,
            sell, distribute, or disclose resident information outside the intended purpose of this system.
          </p>
        </div>

        <div className="p-6 border-t flex justify-end">
          <button
            onClick={onClose}
            className="bg-red-600 text-white px-5 py-3 rounded-2xl font-semibold"
          >
            Done Reviewing
          </button>
        </div>
      </div>
    </div>
  );
}