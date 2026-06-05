import { useRef, useState } from "react";

const TERMS_VERSION = "1.0";

export default function TermsAndConditions({ onClose, onReviewComplete }) {
  const contentRef = useRef(null);
  const [reviewComplete, setReviewComplete] = useState(false);

  const checkReviewProgress = () => {
    const content = contentRef.current;

    if (
      content &&
      content.scrollTop + content.clientHeight >= content.scrollHeight - 12
    ) {
      setReviewComplete(true);
      onReviewComplete?.();
    }
  };

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

        <div
          ref={contentRef}
          onScroll={checkReviewProgress}
          className="p-6 overflow-y-auto text-sm text-gray-700 leading-6 space-y-4"
        >
          <p>
            These Terms and Conditions govern access to and use of Hurricane Hearts, a
            resident-to-resident coordination system serving the Arlington Ridge community.
            By requesting an account, accessing the system, submitting a request, or
            volunteering to help, you acknowledge that you have read and agree to these terms.
          </p>

          <p className="font-semibold text-gray-900">
            Hurricane Hearts is a community coordination tool. It is not an emergency-response
            agency and does not replace 911, fire rescue, law enforcement, emergency medical
            services, utility providers, government emergency management, licensed contractors,
            or other professional services.
          </p>

          <h3 className="font-bold text-lg text-gray-900">1. Eligibility and Accounts</h3>
          <p>
            Access is limited to approved Arlington Ridge residents and other persons specifically
            authorized by Hurricane Hearts administrators. You agree to provide accurate,
            complete, and current information; protect your login credentials; and promptly
            update your profile when your contact information changes. You may not share your
            account or impersonate another person.
          </p>

          <h3 className="font-bold text-lg text-gray-900">2. Emergencies and Official Instructions</h3>
          <p>
            Do not use Hurricane Hearts to report or obtain help for a life-threatening emergency.
            Call 911 immediately. Users must follow evacuation orders, shelter guidance, road
            closures, utility warnings, and all other instructions issued by public authorities.
            Weather alerts and other information displayed in the system may be delayed,
            incomplete, or unavailable.
          </p>

          <h3 className="font-bold text-lg text-gray-900">3. Voluntary Participation and No Guarantee</h3>
          <p>
            All assistance is voluntary. Submitting a request does not guarantee that a volunteer
            will respond, arrive, complete the request, or provide help within any particular
            time. Volunteers may decline or stop an activity whenever they believe it is unsafe,
            beyond their abilities, or inappropriate. Hurricane Hearts does not independently
            verify every user, request, volunteer, statement, skill, vehicle, tool, or service.
          </p>

          <h3 className="font-bold text-lg text-gray-900">4. Safety and Scope of Assistance</h3>
          <p>
            Users and volunteers are responsible for evaluating conditions and acting within
            their own abilities. Do not perform work involving downed or energized power lines,
            gas leaks, floodwater, unstable structures, large or suspended trees, hazardous
            materials, medical treatment, or other dangerous conditions. Do not use vehicles,
            ladders, chainsaws, power tools, or other equipment unless you are capable, properly
            equipped, and legally permitted to do so. Professional assistance should be used when
            appropriate.
          </p>

          <h3 className="font-bold text-lg text-gray-900">5. Requests, Claims, and Completion</h3>
          <p>
            Requestors must describe their needs accurately and disclose known hazards or special
            circumstances. Volunteers should claim only requests they reasonably expect to perform
            and should communicate promptly if plans change. A request marked completed indicates
            only that the participating users reported it complete; it is not an inspection,
            warranty, or certification by Hurricane Hearts.
          </p>

          <h3 className="font-bold text-lg text-gray-900">6. Food, Meals, and Allergies</h3>
          <p>
            Residents requesting or providing food are responsible for communicating ingredients,
            food allergies, dietary restrictions, preparation practices, storage conditions, and
            delivery timing. Hurricane Hearts does not inspect food, verify ingredients, guarantee
            an allergen-free environment, or warrant that food is safe for any particular person.
            Anyone with a severe allergy or medical dietary need should use appropriate caution
            and should not rely solely on information entered in the system.
          </p>

          <h3 className="font-bold text-lg text-gray-900">7. Transportation</h3>
          <p>
            Drivers are responsible for maintaining a valid license, legally required insurance,
            a safe vehicle, and compliance with all traffic laws and official travel restrictions.
            Riders and drivers participate voluntarily and are responsible for deciding whether
            transportation is safe and appropriate.
          </p>

          <h3 className="font-bold text-lg text-gray-900">8. Borrowed and Donated Supplies</h3>
          <p>
            Owners should clearly label borrowed items with their name and telephone number.
            Borrowers must use reasonable care and return items as agreed. Users are responsible
            for deciding whether an item is safe and suitable before using it. Hurricane Hearts
            does not inspect, maintain, insure, replace, or guarantee borrowed or donated property
            and is not responsible for loss, theft, damage, defects, or misuse.
          </p>

          <h3 className="font-bold text-lg text-gray-900">9. Privacy and Resident Information</h3>
          <p>
            The system may contain names, addresses, lot numbers, telephone numbers, email
            addresses, assistance needs, volunteer preferences, request history, and related
            information. You may use resident information only for legitimate Hurricane Hearts
            coordination and community-support purposes. You may not sell, publish, distribute,
            harvest, or use resident information for advertising, solicitation, harassment, or
            unrelated purposes. No online system can be guaranteed completely secure.
          </p>

          <h3 className="font-bold text-lg text-gray-900">10. Acceptable Conduct</h3>
          <p>
            Users must communicate respectfully and may not submit false or misleading
            information, misuse the system, interfere with its operation, engage in unlawful
            activity, discriminate, threaten, harass, or exploit another resident. Concerns about
            safety, conduct, or misuse should be reported to a Hurricane Hearts administrator.
          </p>

          <h3 className="font-bold text-lg text-gray-900">11. Administration and Account Actions</h3>
          <p>
            Administrators may review requests and account information, correct records, contact
            users, approve or deny access, reassign or cancel requests, and suspend or deactivate
            accounts when reasonably necessary for safety, system integrity, compliance, or
            community operations.
          </p>

          <h3 className="font-bold text-lg text-gray-900">12. Assumption of Risk and Limitations</h3>
          <p>
            Participation may involve risks, including personal injury, illness, property damage,
            transportation incidents, equipment failure, food-related illness or allergic
            reaction, delayed assistance, and acts or omissions of other users. To the fullest
            extent permitted by applicable law, users accept the risks of their voluntary
            participation and understand that Hurricane Hearts and its administrators do not
            guarantee the availability, quality, safety, accuracy, or outcome of assistance.
            Nothing in these terms waives rights or responsibilities that cannot legally be waived.
          </p>

          <h3 className="font-bold text-lg text-gray-900">13. Changes to These Terms</h3>
          <p>
            Hurricane Hearts may update these terms as the program or applicable requirements
            change. Users may be required to review and accept a revised version before continuing
            to use the system.
          </p>

          <h3 className="font-bold text-lg text-gray-900">14. Governing Law and Review</h3>
          <p>
            These terms are governed by applicable Florida and federal law. This draft should be
            reviewed by qualified Florida legal counsel before public launch, particularly with
            respect to organizational status, insurance, volunteer activities, food assistance,
            transportation, privacy, and liability.
          </p>
        </div>

        <div className="p-6 border-t flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-gray-600">
            {reviewComplete
              ? "Review complete. You may close this window and accept the terms."
              : "Scroll to the bottom to complete your review."}
          </p>
          <button
            onClick={onClose}
            disabled={!reviewComplete}
            className={
              reviewComplete
                ? "bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-lg font-semibold"
                : "bg-gray-200 text-gray-400 px-5 py-3 rounded-lg font-semibold cursor-not-allowed"
            }
          >
            Done Reviewing
          </button>
        </div>
      </div>
    </div>
  );
}
