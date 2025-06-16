// --- User State ---
export let currentUser = null;
export let userProfile = {};

export function setCurrentUser(user) {
    currentUser = user;
}
export function setUserProfile(profile) {
    userProfile = profile || {};
}
export function clearUserState() {
    currentUser = null;
    userProfile = {};
}

// --- Data State ---
export let allLeads = [];
export let allTasks = [];
export let allCustomEmailTemplates = [];
export let allDocuments = [];
export let allDripCampaigns = [];
let dataListeners = [];

export function setLeads(leads) { allLeads = leads; }
export function setTasks(tasks) { allTasks = tasks; }
export function setCustomEmailTemplates(templates) { allCustomEmailTemplates = templates; }
export function setDocuments(documents) { allDocuments = documents; }
export function setDripCampaigns(campaigns) { allDripCampaigns = campaigns; }

export function addDataListener(listener) {
    dataListeners.push(listener);
}
export function clearAllData() {
    dataListeners.forEach(unsubscribe => unsubscribe());
    dataListeners = [];
    allLeads = [];
    allTasks = [];
    allCustomEmailTemplates = [];
    allDocuments = [];
    allDripCampaigns = [];
}

// --- Static Data ---
export const pipelineStages = [
    'New Lead', 'Contacted', 'Appointment Set', 'Nurturing', 'Active Buyer',
    'Pre-Listing', 'Active Seller', 'Active Listing', 'Offer/Contract',
    'Under Contract', 'Closed', 'Archived'
];

export const dripTaskTemplates = [
    { id: 'dt_followup_call_task', name: "Call Follow-up Task", description: "Creates a task to call the lead.", type: "task", taskTitle: "Follow-up call with {{lead_name}}" },
    { id: 'dt_task_research', name: "Research Task", description: "Creates a task to research a topic for the lead.", type: "task", taskTitle: "Research neighborhoods for {{lead_name}}" },
];

export const emailTemplates = [
    {
        category: "Automation & Drips",
        tasks: [
            { id: 'et_drip_intro', name: "Welcome Email", subject: "Welcome to our Service!", body: "Hi {{lead_name}},\n\nWelcome! We're excited to help you.\n\nThanks,\nThe Team", isDripCompatible: true },
            { id: 'et_drip_checkin', name: "Friendly Check-in", subject: "Just Checking In!", body: "Hi {{lead_name}},\n\nHope you're doing well and that we can help with any questions you might have.\n\nBest,\n[Your Name]", isDripCompatible: true },
            { id: 'et_drip_feedback', name: "Request Feedback", subject: "Your Feedback is Appreciated!", body: "Hi {{lead_name}},\n\nWe'd love to hear your thoughts on how things are going so far.\n\nThanks,\nThe Team", isDripCompatible: true },
            { id: 'et_drip_showing_invite', name: "Showing Invitation", subject: "Invitation: Property Showing", body: "Hi {{lead_name}},\n\nWould you be interested in a showing for a great new property I think you'll like?\n\nBest,\n[Your Name]", isDripCompatible: true },
        ]
    },
    {
        category: "Lead Introduction / First Contact",
        tasks: [
            { id: 'et_intro_inquiry', name: "Intro Email", subject: "Following Up: Your Property Inquiry", body: "Hi {{lead_name}},\n\nThanks for your interest! When would be a good time for a quick chat about your needs?\n\nBest,\n[Your Name]", isDripCompatible: true },
            { id: 'et_intro_help', name: "Meet / Help", subject: "Can I Help with Your Home Search/Sale?", body: "Hi {{lead_name}},\n\nJust wanted to introduce myself and see if I can assist with your real estate goals.\n\nBest,\n[Your Name]", isDripCompatible: true },
            { id: 'et_intro_schedule', name: "Schedule Call", subject: "Quick Call to Discuss Your Real Estate Needs?", body: "Hi {{lead_name}},\n\nWould you be open to a brief call this week to discuss your property search/sale?\n\nBest,\n[Your Name]", isDripCompatible: true },
        ]
    },
    {
        category: "Property Alerts / Match Notifications",
        tasks: [
            { id: 'et_alert_new', name: "New Matches", subject: "New Properties Matching Your Criteria!", body: "Hi {{lead_name}},\n\nI've found some new listings that match what you're looking for. Take a look:\n[Link to Properties]\n\nBest,\n[Your Name]", isDripCompatible: false },
            { id: 'et_alert_listed', name: "Just Listed", subject: "Hot New Listing You Might Like!", body: "Hi {{lead_name}},\n\nA new property just hit the market that I think you'll want to see:\n[Link to Property]\n\nBest,\n[Your Name]", isDripCompatible: false },
            { id: 'et_alert_price_drop', name: "Price Drop", subject: "Price Update on a Property You Viewed", body: "Hi {{lead_name}},\n\nGood news! There's been a price reduction on a property you showed interest in:\n[Link to Property]\n\nBest,\n[Your Name]", isDripCompatible: false },
        ]
    },
    {
        category: "Showing Coordination",
        tasks: [
            { id: 'et_show_confirm', name: "Confirm Showing", subject: "Confirming Your Showing for [Property Address]", body: "Hi {{lead_name}},\n\nJust confirming our showing for [Property Address] on [Date] at [Time]. Looking forward to it!\n\nBest,\n[Your Name]", isDripCompatible: false },
            { id: 'et_show_book', name: "Book Tour", subject: "Let's Book Some Property Tours!", body: "Hi {{lead_name}},\n\nReady to see some homes? Let me know your availability and I'll set up a tour.\n\nBest,\n[Your Name]", isDripCompatible: true },
            { id: 'et_show_prep', name: "Showing Prep", subject: "Getting Ready for Our Showing at [Property Address]", body: "Hi {{lead_name}},\n\nHere are a few details for our upcoming showing at [Property Address] on [Date]:\n[Details]\n\nBest,\n[Your Name]", isDripCompatible: false },
        ]
    },
    {
        category: "Post-Showing Follow-Up",
        tasks: [
            { id: 'et_postshow_feedback', name: "Showing Feedback", subject: "Thoughts on [Property Address]?", body: "Hi {{lead_name}},\n\nFollowing up on our showing at [Property Address]. What were your thoughts?\n\nBest,\n[Your Name]", isDripCompatible: false },
            { id: 'et_postshow_recap', name: "Recap / Next", subject: "Recap of Our Recent Showings / Next Steps", body: "Hi {{lead_name}},\n\nHere's a quick recap of the properties we saw. What are your thoughts for next steps?\n[Recap]\n\nBest,\n[Your Name]", isDripCompatible: false },
            { id: 'et_postshow_revisit', name: "Revisit Homes", subject: "Interested in a Second Look?", body: "Hi {{lead_name}},\n\nWere there any properties from our recent tour you'd like to revisit?\n\nBest,\n[Your Name]", isDripCompatible: true },
        ]
    },
    {
        category: "Offer / Transaction Updates",
        tasks: [
            { id: 'et_offer_strategy', name: "Offer Strategy", subject: "Let's Discuss Offer Strategy for [Property Address]", body: "Hi {{lead_name}},\n\nLet's connect to discuss the best offer strategy for [Property Address].\n\nBest,\n[Your Name]", isDripCompatible: false },
            { id: 'et_offer_sent', name: "Offer Sent", subject: "Update: Your Offer for [Property Address] Has Been Submitted", body: "Hi {{lead_name}},\n\nJust wanted to let you know your offer for [Property Address] has been officially submitted. I'll keep you updated!\n\nBest,\n[Your Name]", isDripCompatible: false },
            { id: 'et_offer_inspection', name: "Inspection Info", subject: "Inspection Details for [Property Address]", body: "Hi {{lead_name}},\n\nHere's the information regarding the upcoming inspection for [Property Address].\n\nBest,\n[Your Name]", isDripCompatible: false },
            { id: 'et_offer_uc', name: "Under Contract", subject: "Exciting News! We're Under Contract on [Property Address]", body: "Hi {{lead_name}},\n\nGreat news! Your offer on [Property Address] has been accepted. We are now under contract!\n\nBest,\n[Your Name]", isDripCompatible: false },
        ]
    },
    {
        category: "Client Education / Value Adds",
        tasks: [
            { id: 'et_edu_market', name: "Market Update", subject: "Your Local Market Update", body: "Hi {{lead_name}},\n\nHere's the latest on the market...\n\nRegards,\n[Your Name]", isDripCompatible: true },
            { id: 'et_edu_tips', name: "Buyer Tips", subject: "Helpful Tips for Home Buyers", body: "Hi {{lead_name}},\n\nThought you might find these home buying tips useful!\n[Link to Tips]\n\nBest,\n[Your Name]", isDripCompatible: false },
            { id: 'et_edu_financing', name: "Financing Help", subject: "Need Financing Info? I Can Help!", body: "Hi {{lead_name}},\n\nIf you have any questions about financing or need lender recommendations, let me know.\n\nBest,\n[Your Name]", isDripCompatible: true },
            { id: 'et_edu_checklist', name: "Moving Checklist", subject: "Your Handy Moving Checklist", body: "Hi {{lead_name}},\n\nTo help with your upcoming move, here's a handy checklist.\n[Link to Checklist]\n\nBest,\n[Your Name]", isDripCompatible: false },
        ]
    },
    {
        category: "Re-Engagement / Cold Lead Check-In",
        tasks: [
            { id: 'et_re_still_interested', name: "Still Interested?", subject: "Checking In: Still Looking for a Home?", body: "Hi {{lead_name}},\n\nJust checking in to see if you're still in the market or if your plans have changed.\n\nBest,\n[Your Name]", isDripCompatible: true },
            { id: 'et_re_market_checkin', name: "Market Check-In", subject: "Quick Market Update / Check-In", body: "Hi {{lead_name}},\n\nThe market is active! Just wanted to see if you're still considering a move.\n\nBest,\n[Your Name]", isDripCompatible: true },
            { id: 'et_re_catch_up', name: "Let's Catch Up", subject: "Quick Catch-Up Call?", body: "Hi {{lead_name}},\n\nIt's been a while! Would love to catch up and see if I can help with any real estate needs.\n\nBest,\n[Your Name]", isDripCompatible: true },
        ]
    },
    {
        category: "Post-Close",
        tasks: [
            { id: 'et_post_congrats', name: "Congrats Homeowner", subject: "Congratulations on Your New Home!", body: "Hi {{lead_name}},\n\nCongratulations again on your new home! Wishing you all the best in your new space.\n\nBest,\n[Your Name]", isDripCompatible: false },
            { id: 'et_post_review', name: "Leave Review", subject: "Could You Share Your Experience?", body: "Hi {{lead_name}},\n\nIf you were happy with my service, I'd be grateful if you could leave a quick review.\n[Link to Review Site]\n\nBest,\n[Your Name]", isDripCompatible: true },
            { id: 'et_post_refer', name: "Refer Me", subject: "Know Anyone Looking to Buy or Sell?", body: "Hi {{lead_name}},\n\nI'm always grateful for referrals! If you know anyone else looking to buy or sell, I'd appreciate you passing on my contact info.\n\nBest,\n[Your Name]", isDripCompatible: true },
        ]
    }
];

export const taskTemplates = [
    {
        category: "Lead Management Tasks", tasks: [
            { title: "Initial Lead Follow-Up Call", description: "Call new lead to introduce myself, understand their needs, and establish rapport." },
            { title: "Send Intro Email/Text", description: "Send a welcome email or text with helpful info, property links, or my Calendly link for booking." },
            { title: "Tag and Categorize Lead", description: "Apply relevant tags (e.g., Buyer, Seller, Investor) and status (Hot, Warm, Cold) to the lead." },
            { title: "Schedule Next Touchpoint", description: "Set a future task to follow up via call, email, text, or social media DM." },
            { title: "Assign Lead to Agent", description: "Assign this lead to a specific agent or team member for handling." },
            { title: "Send Pre-Qualification Info", description: "Email the lead information about the pre-qualification process and recommended lenders." },
        ]
    },
    {
        category: "Appointment / Showings Tasks", tasks: [
            { title: "Schedule Property Showing", description: "Coordinate with the listing agent and client to schedule a property showing." },
            { title: "Confirm Showing", description: "Confirm the showing time and location with both the buyer/client and the listing agent." },
            { title: "Send Directions / Property Details", description: "Email/text the client with the property address, directions, and listing details before the showing." },
            { title: "Post-Showing Follow-Up", description: "Call the client after the showing to gather feedback and discuss their thoughts on the property." },
            { title: "Set Up Property Tour Route", description: "Plan and map out a logical route for a day of showing multiple homes." },
        ]
    },
    {
        category: "Ongoing Lead Nurture Tasks", tasks: [
            { title: "Send Weekly Market Update", description: "Send a personalized or automated email/text with recent market activity in their area of interest." },
            { title: "Monthly Long-Term Lead Touchpoint", description: "Check in with a long-term lead to see how their plans are progressing." },
            { title: "Send New Matching Listings", description: "Proactively send new listings from the MLS that match the client's criteria." },
            { title: "Birthday/Anniversary Follow-Up", description: "Send a personalized message for their birthday, anniversary, or home-buying anniversary." },
            { title: "Reconnect with Cold Lead", description: "Attempt to re-engage a stale or cold lead with a new offer, question, or market insight." },
        ]
    },
    {
        category: "Client Onboarding Tasks", tasks: [
            { title: "Send Buyer Intake Form", description: "Email the new client an intake form or needs assessment questionnaire." },
            { title: "Create MLS Search / Alerts", description: "Set up a customized property search in the MLS and enable automatic email alerts for the client." },
            { title: "Add to Drip Campaign", description: "Assign the client to the appropriate email drip campaign (e.g., First-Time Homebuyer, Seller Prep)." },
            { title: "Introduce Key Team Members", description: "Introduce the Transaction Coordinator, preferred lender, or title representative to the client." },
        ]
    },
    {
        category: "Listing Prep Tasks (For Sellers)", tasks: [
            { title: "Schedule Photography/Videography", description: "Book a professional photographer and videographer for the property." },
            { title: "Order Signage / Lockbox", description: "Place an order for the 'For Sale' sign and install a lockbox at the property." },
            { title: "Create Listing in MLS", description: "Write the listing description, gather all details, and upload photos/videos to the MLS." },
            { title: "Prepare CMA / Set Price", description: "Complete a Comparative Market Analysis (CMA) and discuss the optimal listing price with the seller." },
            { title: "Launch Listing Marketing", description: "Publish the listing on the website, social media, and other marketing channels." },
            { title: "Schedule Open House", description: "Plan and schedule the date and time for the first open house." },
        ]
    },
    {
        category: "Transaction Management Tasks", tasks: [
            { title: "Track Earnest Money Deposit", description: "Confirm the earnest money deposit has been submitted by the deadline." },
            { title: "Order / Review Inspection", description: "Schedule the home inspection and review the report with the client upon receipt." },
            { title: "Coordinate Repairs or Credits", description: "Negotiate any inspection-related repairs or seller credits with the listing agent." },
            { title: "Follow-Up on Appraisal", description: "Schedule the appraisal and follow up to ensure it's completed on time and at value." },
            { title: "Confirm Closing Disclosure", description: "Verify that the client has received and reviewed the Closing Disclosure (CD) at least 3 days before closing." },
            { title: "Schedule Final Walkthrough", description: "Coordinate the final walkthrough with the client shortly before closing." },
            { title: "Send Closing Day Invite", description: "Send a calendar invitation to the client with the closing time, date, and location." },
        ]
    },
    {
        category: "Post-Close Tasks", tasks: [
            { title: "Send Congratulations Gift/Email", description: "Send a closing gift or a congratulatory email to the new homeowners." },
            { title: "Request Review/Testimonial", description: "Ask the happy client for a review on Zillow, Google, or another platform." },
            { title: "Add to Home Anniversary Follow-Up", description: "Set a recurring task to follow up on their 1-year home anniversary." },
            { title: "Invite to Client Appreciation Event", description: "Add the client to the mailing list for future client appreciation events." },
            { title: "Request Referrals", description: "Follow up after a few weeks to ask if they know anyone else looking to buy or sell." },
        ]
    },
    {
        category: "Automation-Oriented Tasks", tasks: [
            { title: "Assign Task After Form Submission", description: "System task: create a follow-up task automatically when a lead form is submitted." },
            { title: "Trigger Welcome SMS", description: "System task: automatically send a welcome text message to a new lead." },
            { title: "Start Drip Campaign", description: "System task: automatically enroll a new lead in a predefined email drip campaign." },
        ]
    }
];

export const premadeCaptureFormTemplates = [
    {
        key: 'homeBuyerInterest',
        title: 'Home Buyer Interest',
        description: 'Capture details from potential home buyers.',
        formTitleForEmbed: 'Find Your Dream Home!',
        subtextForEmbed: "Tell us what you're looking for, and we'll help you find it.",
        submitButtonText: 'Start My Home Search!',
        fields: [
            { label: 'Full Name:', name: 'name', type: 'text', required: true },
            { label: 'Email Address:', name: 'email', type: 'email', required: true },
            { label: 'Phone Number:', name: 'phone', type: 'tel' },
            { label: 'Desired Location(s) (City, Neighborhood, Zip):', name: 'desiredLocation', type: 'text', placeholder: 'e.g., Downtown, Northside, 90210' },
            {
                label: 'Budget Range:', name: 'budget', type: 'select', options: [
                    { value: '', label: 'Select Budget...' }, { value: '<200k', label: '<$200,000' },
                    { value: '200k-400k', label: '$200,000 - $400,000' }, { value: '400k-600k', label: '$400,000 - $600,000' },
                    { value: '600k-800k', label: '$600,000 - $800,000' }, { value: '800k-1M', label: '$800,000 - $1,000,000' },
                    { value: '1M+', label: '$1,000,000+' }
                ]
            },
            {
                label: 'Type of Property:', name: 'propertyType', type: 'select', options: [
                    { value: '', label: 'Select Type...' }, { value: 'Single Family Home', label: 'Single Family Home' },
                    { value: 'Condo/Townhouse', label: 'Condo/Townhouse' }, { value: 'Land', label: 'Land' },
                    { value: 'Multi-Family', label: 'Multi-Family' }, { value: 'Other', label: 'Other' }
                ]
            },
            {
                label: 'Financing Status:', name: 'financingStatus', type: 'select', options: [
                    { value: '', label: 'Select Status...' }, { value: 'Pre-approved', label: 'Pre-approved' },
                    { value: 'Cash Buyer', label: 'Cash Buyer' }, { value: 'Needs Financing', label: 'Needs Financing' },
                    { value: 'Exploring Options', label: 'Exploring Options' }
                ]
            },
            {
                label: 'Timeline to Buy:', name: 'timeline', type: 'select', options: [
                    { value: '', label: 'Select Timeline...' }, { value: 'Immediately', label: 'Immediately' },
                    { value: '1-3 Months', label: '1-3 Months' }, { value: '3-6 Months', label: '3-6 Months' },
                    { value: '6+ Months', label: '6+ Months' }, { value: 'Just Browsing', label: 'Just Browsing' }
                ]
            },
            { label: 'Additional Notes:', name: 'notes', type: 'textarea', placeholder: 'e.g., specific features, number of beds/baths' }
        ]
    },
    {
        key: 'homeSellerValuation',
        title: 'Home Seller Valuation',
        description: 'Collect property details for a Comparative Market Analysis (CMA).',
        formTitleForEmbed: 'Thinking of Selling? Get a Free Valuation!',
        subtextForEmbed: "Find out what your property is worth in today's market.",
        submitButtonText: 'Request My Free Valuation!',
        fields: [
            { label: 'Property Address:', name: 'propertyAddress', type: 'text', required: true, placeholder: 'e.g., 123 Main St, Anytown, USA' },
            {
                label: 'Type of Home:', name: 'propertyType', type: 'select', options: [
                    { value: '', label: 'Select Type...' }, { value: 'Single Family Home', label: 'Single Family Home' },
                    { value: 'Condo/Townhouse', label: 'Condo/Townhouse' }, { value: 'Multi-Family', label: 'Multi-Family' },
                    { value: 'Land', label: 'Land' }, { value: 'Other', label: 'Other' }
                ]
            },
            {
                label: 'Number of Bedrooms:', name: 'bedrooms', type: 'select', options: [
                    { value: '', label: 'Select...' }, { value: '1', label: '1' }, { value: '2', label: '2' }, { value: '3', label: '3' },
                    { value: '4', label: '4' }, { value: '5', label: '5' }, { value: '6+', label: '6+' }
                ]
            },
            {
                label: 'Number of Bathrooms:', name: 'bathrooms', type: 'select', options: [
                    { value: '', label: 'Select...' }, { value: '1', label: '1' }, { value: '1.5', label: '1.5' }, { value: '2', label: '2' },
                    { value: '2.5', label: '2.5' }, { value: '3', label: '3' }, { value: '3.5', label: '3.5' }, { value: '4+', label: '4+' }
                ]
            },
            { label: 'Your Full Name:', name: 'name', type: 'text', required: true },
            { label: 'Your Email Address:', name: 'email', type: 'email', required: true },
            { label: 'Your Phone Number:', name: 'phone', type: 'tel' },
        ]
    },
    {
        key: 'relocationInterest',
        title: 'Relocation Interest',
        description: 'For clients planning to move to or from the area.',
        formTitleForEmbed: 'Planning a Move?',
        subtextForEmbed: "Let us help with your relocation needs.",
        submitButtonText: 'Get Relocation Assistance',
        fields: [
            { label: 'Full Name:', name: 'name', type: 'text', required: true },
            { label: 'Email Address:', name: 'email', type: 'email', required: true },
            { label: 'Phone Number:', name: 'phone', type: 'tel' },
            { label: 'Moving From (City, State):', name: 'movingFrom', type: 'text' },
            { label: 'Moving To (City, State):', name: 'movingTo', type: 'text', required: true },
        ]
    },
    {
        key: 'investorIntake',
        title: 'Investor Intake',
        description: 'Understand the goals of real estate investors.',
        formTitleForEmbed: 'Real Estate Investment Opportunities',
        subtextForEmbed: "Tell us about your investment goals.",
        submitButtonText: 'Explore Investments',
        fields: [
            { label: 'Full Name:', name: 'name', type: 'text', required: true },
            { label: 'Email Address:', name: 'email', type: 'email', required: true },
            { label: 'Phone Number:', name: 'phone', type: 'tel' },
            { label: 'Investment Budget Range:', name: 'investmentBudget', type: 'text', placeholder: 'e.g., $100k - $500k', required: true },
        ]
    },
    {
        key: 'rentalInquiry',
        title: 'Rental Inquiry',
        description: 'For leads looking for various types of rental properties.',
        formTitleForEmbed: 'Find Your Perfect Rental',
        subtextForEmbed: "Let us know your rental preferences.",
        submitButtonText: 'Search Rentals',
        fields: [
            { label: 'Full Name:', name: 'name', type: 'text', required: true },
            { label: 'Email Address:', name: 'email', type: 'email', required: true },
            { label: 'Phone Number:', name: 'phone', type: 'tel' },
        ]
    },
    {
        key: 'openHouseRegistration',
        title: 'Open House Registration',
        description: 'Quick registration for open house visitors.',
        formTitleForEmbed: 'Welcome to the Open House!',
        subtextForEmbed: "Please sign in.",
        submitButtonText: 'Register',
        fields: [
            { label: 'Full Name:', name: 'name', type: 'text', required: true },
            { label: 'Email Address:', name: 'email', type: 'email', required: true },
            { label: 'Phone Number:', name: 'phone', type: 'tel' },
        ]
    },
    {
        key: 'propertyWatchSignup',
        title: 'Property Watch / Listing Alerts',
        description: 'Sign up users for automated listing alerts.',
        formTitleForEmbed: 'Get Custom Listing Alerts',
        subtextForEmbed: "Be the first to know about new properties matching your criteria.",
        submitButtonText: 'Sign Up for Alerts',
        fields: [
            { label: 'Full Name:', name: 'name', type: 'text', required: true },
            { label: 'Email Address:', name: 'email', type: 'email', required: true },
            { label: 'Phone Number (for SMS alerts, optional):', name: 'phone', type: 'tel' },
        ]
    },
    {
        key: 'referralPartnerIntake',
        title: 'Referral Partner Intake',
        description: 'Onboard new referral partners (agents, vendors).',
        formTitleForEmbed: 'Join Our Referral Network',
        subtextForEmbed: "Connect with us to become a valued referral partner.",
        submitButtonText: 'Submit Partner Info',
        fields: [
            { label: 'Your Full Name:', name: 'name', type: 'text', required: true },
            { label: 'Brokerage / Business Name:', name: 'businessName', type: 'text', required: true },
            { label: 'Email Address:', name: 'email', type: 'email', required: true },
        ]
    }
];

export const flowSteps = {
    'New Lead': {
        title: "👋 New Lead",
        goal: "Make initial contact and qualify.",
        trigger: "Lead created in CRM.",
        checklist: [
            { title: "Log contact attempt", description: "Log a call, text, or email to the new lead." },
            { title: "Ask key questions", description: "Discuss Budget, timeline, motivation, and financing status." },
            { title: "Send questionnaire", description: "Send the appropriate buyer or seller questionnaire." },
            { title: "Schedule appointment", description: "Schedule a buyer consultation or listing appointment." },
            { title: "Assign priority status", description: "Set the lead's priority to Hot, Warm, or Cold." },
            { title: "Create follow-up task", description: "Create a future task to follow up if there is no reply." }
        ]
    },
    'Contacted': {
        title: "📞 Contacted",
        goal: "Set an appointment.",
        trigger: "Two-way communication established.",
        checklist: [
            { title: "Log contact outcome", description: "Add notes about the outcome of the conversation." },
            { title: "Send follow-up email", description: "Send an email summarizing the conversation and next steps." },
            { title: "Set appointment or nurture", description: "If ready, set the appointment. If not, move the lead to the Nurturing stage." },
            { title: "Assign to drip campaign", description: "If appropriate, assign the lead to a relevant drip campaign." },
            { title: "Schedule next follow-up", description: "Create a future task for the next touchpoint." }
        ]
    },
    'Appointment Set': {
        title: "📅 Appointment Set",
        goal: "Meet and evaluate opportunity.",
        trigger: "Client agrees to a consult or tour.",
        checklist: [
            { title: "Confirm appointment details", description: "Confirm the date, time, and location of the appointment." },
            { title: "Send meeting agenda", description: "Send the client a meeting agenda or a list of properties for the tour." },
            { title: "Prepare materials", description: "Prepare the CMA for a seller or a market report for a buyer." },
            { title: "Add event to calendar", description: "Add the appointment to the calendar with reminders for all parties." },
            { title: "Send 24-hour reminder", description: "Send an SMS reminder to the client 24 hours before the appointment." }
        ]
    },
    'Nurturing': {
        title: "🌱 Nurturing",
        goal: "Stay top-of-mind until they are ready.",
        trigger: "Lead is not ready for an appointment.",
        checklist: [
            { title: "Add to nurture campaign", description: "Assign the lead to a long-term nurture drip campaign." },
            { title: "Set up property alerts", description: "Set up MLS property alerts or market updates." },
            { title: "Schedule recurring follow-up", description: "Set a recurring task to check in every 30-90 days." },
            { title: "Send valuable content", description: "Send helpful content like blog posts, guides, or videos." },
            { title: "Engage on social media", description: "Like or comment on their social media posts if applicable." }
        ]
    },
    'Active Buyer': {
        title: "🛠️ Active Buyer",
        goal: "Find a property and write an offer.",
        trigger: "Signed Buyer Representation Agreement.",
        checklist: [
            { title: "Set up MLS auto-search", description: "Create a customized search in the MLS with automatic alerts." },
            { title: "Book property showings", description: "Schedule and coordinate property tours." },
            { title: "Share property review sheets", description: "Provide feedback forms or review sheets for visited properties." },
            { title: "Tag lead as 'Active Buyer'", description: "Update the lead's tags in the CRM." },
            { title: "Schedule weekly touchpoint", description: "Create a recurring task for a weekly check-in call, text, or email." }
        ]
    },
    'Pre-Listing': {
        title: "📋 Pre-Listing",
        goal: "Prepare the property for market.",
        trigger: "Listing Agreement signed.",
        checklist: [
            { title: "Schedule services", description: "Schedule photographer, stager, and cleaning services." },
            { title: "Order sign and lockbox", description: "Order the 'For Sale' sign and install the lockbox." },
            { title: "Gather property documents", description: "Collect all necessary documents and details for the listing." },
            { title: "Create marketing materials", description: "Write listing copy and design flyers or social media posts." },
            { title: "Set 'Go-Live' date", description: "Determine the official date the property will go live on the market." }
        ]
    },
    'Active Seller': {
        title: "🏡 Active Seller",
        goal: "Market the property and generate offers.",
        trigger: "Property is live on the MLS.",
        checklist: [
            { title: "Launch marketing campaign", description: "Launch marketing campaign (social media, email blast, etc.)." },
            { title: "Schedule and promote open houses", description: "Schedule and promote open houses." },
            { title: "Coordinate and gather showing feedback", description: "Coordinate and gather feedback from showings." },
            { title: "Provide weekly activity report to seller", description: "Provide weekly activity report to the seller." },
            { title: "Proactively call potential buyers/agents", description: "Proactively call potential buyers and agents." }
        ]
    },
    'Active Listing': {
        title: "🏡 Active Listing",
        goal: "Market the property and generate offers.",
        trigger: "Property is live on the MLS.",
        checklist: [
            { title: "Launch marketing campaign", description: "Execute the marketing plan across social media, email, etc." },
            { title: "Schedule open houses", description: "Schedule and promote upcoming open house events." },
            { title: "Gather showing feedback", description: "Coordinate and collect feedback from all property showings." },
            { title: "Send weekly seller report", description: "Provide a weekly activity and feedback report to the seller." },
            { title: "Proactive outreach", description: "Make proactive calls to potential buyers and agents." }
        ]
    },
    'Offer/Contract': {
        title: "💼 Offer / Contract Phase",
        goal: "Navigate negotiation and paperwork.",
        trigger: "Buyer submits or seller receives an offer.",
        checklist: [
            { title: "Draft or review offer", description: "Draft or carefully review all offer documents." },
            { title: "Negotiate terms", description: "Negotiate terms, conditions, and price with the other party." },
            { title: "Manage digital signatures", description: "Use a service like DocuSign to get all necessary signatures." },
            { title: "Update stage to 'Under Contract'", description: "Change the lead's pipeline stage to 'Under Contract' upon execution." },
            { title: "Send transaction timeline", description: "Send the client a timeline of important dates (inspection, appraisal, etc.)." },
            { title: "Introduce transaction coordinator", description: "If applicable, introduce the transaction coordinator to the client." }
        ]
    },
    'Under Contract': {
        title: "🧾 Escrow / Transaction Management",
        goal: "Ensure the deal closes smoothly.",
        trigger: "Executed contract.",
        checklist: [
            { title: "Open escrow and deposit earnest money", description: "Open escrow/title and confirm the earnest money has been deposited." },
            { title: "Track all contingencies", description: "Monitor deadlines for inspection, appraisal, and financing." },
            { title: "Schedule final walkthrough", description: "Coordinate the final walkthrough with the client before closing." },
            { title: "Coordinate with all parties", description: "Maintain communication with the lender, title company, and co-op agent." },
            { title: "Send weekly client updates", description: "Provide weekly status updates to your client." },
            { title: "Prepare closing gift", description: "Prepare and organize the closing gift for the client." }
        ]
    },
    'Closed': {
        title: "🎉 Closing Day / Beyond",
        goal: "Complete the sale and foster a long-term relationship.",
        trigger: "Final signatures and funding.",
        checklist: [
            { title: "Celebrate with client", description: "Deliver a closing gift, send a card, or post a celebratory video." },
            { title: "Request a review", description: "Ask for a review on Google, Zillow, or Facebook." },
            { title: "Update CRM tag", description: "Change the lead's tag to 'Closed Buyer' or 'Closed Seller'." },
            { title: "Add to past client list", description: "Add the client to your sphere of influence and past client list." },
            { title: "Enroll in post-close drip", description: "Enroll the client in a monthly value-add drip campaign." },
            { title: "Schedule future touches", description: "Create tasks for 3-month, 6-month, and 1-year anniversary check-ins." }
        ]
    }
};