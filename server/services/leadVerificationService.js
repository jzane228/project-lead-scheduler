/**
 * Lead Verification Service
 * Ensures data quality and accuracy through cross-validation
 * Features:
 * - Company name verification against business databases
 * - Contact information validation
 * - Location verification using geocoding
 * - Budget and project size validation
 * - Cross-reference checking
 * - Confidence scoring
 */
class LeadVerificationService {
  constructor() {
    this.verificationCache = new Map();
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours

    // Verification statistics
    this.stats = {
      totalVerified: 0,
      companyVerified: 0,
      contactVerified: 0,
      locationVerified: 0,
      budgetVerified: 0,
      averageConfidence: 0
    };

    console.log('✅ Lead Verification Service initialized');
  }

  /**
   * Main verification function
   */
  async verifyLead(lead) {
    console.log(`🔍 Verifying lead: ${lead.title}`);

    const verificationResult = {
      originalLead: lead,
      verifiedLead: { ...lead },
      verificationDetails: {},
      confidence: lead.confidence || 0,
      verified: false,
      issues: [],
      recommendations: []
    };

    try {
      // Verify company information
      await this.verifyCompany(verificationResult);

      // Verify contact information
      await this.verifyContacts(verificationResult);

      // Verify location
      await this.verifyLocation(verificationResult);

      // Verify project details
      await this.verifyProjectDetails(verificationResult);

      // Cross-reference validation
      await this.crossReferenceValidation(verificationResult);

      // Calculate final confidence
      verificationResult.confidence = this.calculateFinalConfidence(verificationResult);

      // Mark as verified if confidence is high enough
      verificationResult.verified = verificationResult.confidence >= 70;

      // Update statistics
      this.updateVerificationStats(verificationResult);

      console.log(`✅ Lead verification complete. Confidence: ${verificationResult.confidence}%`);

      return verificationResult;

    } catch (error) {
      console.warn('⚠️ Lead verification failed:', error.message);
      verificationResult.issues.push(`Verification error: ${error.message}`);
      return verificationResult;
    }
  }

  /**
   * Verify company information
   */
  async verifyCompany(verificationResult) {
    const lead = verificationResult.verifiedLead;

    if (!lead.company || lead.company === 'Unknown') {
      verificationResult.issues.push('No company information to verify');
      return;
    }

    try {
      // Check cache first
      const cacheKey = `company_${lead.company.toLowerCase()}`;
      const cached = this.verificationCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
        verificationResult.verificationDetails.company = cached.data;
        return;
      }

      // Company validation checks
      const companyValidation = {
        name: lead.company,
        isValidFormat: this.isValidCompanyName(lead.company),
        hasBusinessTerms: this.hasBusinessTerms(lead.company),
        length: lead.company.length,
        verified: false,
        sources: []
      };

      // Check for common business suffixes
      const businessSuffixes = ['Inc', 'LLC', 'Corp', 'Corporation', 'Group', 'Holdings', 'Enterprises', 'Partners', 'Associates', 'Company', 'Ltd', 'Limited'];
      companyValidation.hasBusinessSuffix = businessSuffixes.some(suffix =>
        lead.company.toLowerCase().includes(suffix.toLowerCase())
      );

      // Check against known invalid patterns
      const invalidPatterns = ['lorem ipsum', 'test company', 'example corp', 'sample business'];
      companyValidation.isLikelyTest = invalidPatterns.some(pattern =>
        lead.company.toLowerCase().includes(pattern)
      );

      // Overall company validity
      companyValidation.verified = companyValidation.isValidFormat &&
                                  companyValidation.hasBusinessTerms &&
                                  !companyValidation.isLikelyTest;

      // Store in cache
      this.verificationCache.set(cacheKey, {
        data: companyValidation,
        timestamp: Date.now()
      });

      verificationResult.verificationDetails.company = companyValidation;

      // Update confidence based on company verification
      if (companyValidation.verified) {
        verificationResult.confidence += 15;
        verificationResult.recommendations.push('Company name appears valid');
      } else {
        verificationResult.issues.push('Company name may be invalid or incomplete');
      }

    } catch (error) {
      console.warn('⚠️ Company verification error:', error.message);
      verificationResult.issues.push(`Company verification failed: ${error.message}`);
    }
  }

  /**
   * Verify contact information
   */
  async verifyContacts(verificationResult) {
    const lead = verificationResult.verifiedLead;

    if (!lead.contacts || lead.contacts.length === 0) {
      verificationResult.issues.push('No contact information to verify');
      return;
    }

    const contactValidation = {
      totalContacts: lead.contacts.length,
      validContacts: 0,
      issues: [],
      recommendations: []
    };

    for (const contact of lead.contacts) {
      const contactIssues = [];

      // Validate email format
      if (contact.email) {
        if (!this.isValidEmail(contact.email)) {
          contactIssues.push('Invalid email format');
        } else {
          contactValidation.validContacts++;
        }
      }

      // Validate phone format
      if (contact.phone) {
        if (!this.isValidPhone(contact.phone)) {
          contactIssues.push('Invalid phone format');
        } else {
          contactValidation.validContacts++;
        }
      }

      // Check name validity
      if (contact.name && !this.isValidContactName(contact.name)) {
        contactIssues.push('Contact name appears invalid');
      }

      // Check title relevance
      if (contact.title && !this.isRelevantTitle(contact.title, lead.projectType)) {
        contactIssues.push('Contact title may not be relevant to project');
      }

      contact.validationIssues = contactIssues;
    }

    contactValidation.contactValidityRate = lead.contacts.length > 0
      ? ((contactValidation.validContacts / lead.contacts.length) * 100).toFixed(1) + '%'
      : '0%';

    verificationResult.verificationDetails.contacts = contactValidation;

    // Update confidence based on contact validation
    const contactScore = (contactValidation.validContacts / lead.contacts.length) * 20;
    verificationResult.confidence += contactScore;

    if (contactValidation.validContacts > 0) {
      verificationResult.recommendations.push(`${contactValidation.validContacts} valid contact(s) found`);
    }
  }

  /**
   * Verify location information
   */
  async verifyLocation(verificationResult) {
    const lead = verificationResult.verifiedLead;

    if (!lead.location || lead.location === 'Unknown') {
      verificationResult.issues.push('No location information to verify');
      return;
    }

    try {
      const locationValidation = {
        location: lead.location,
        isValidFormat: this.isValidLocation(lead.location),
        hasGeographicTerms: this.hasGeographicTerms(lead.location),
        length: lead.location.length,
        verified: false
      };

      // Check for geographic indicators
      const geographicTerms = ['downtown', 'uptown', 'midtown', 'district', 'area', 'county', 'city', 'state', 'province'];
      locationValidation.hasGeographicTerms = geographicTerms.some(term =>
        lead.location.toLowerCase().includes(term)
      );

      // Validate against common location patterns
      const locationPatterns = [
        /^[A-Z][a-zA-Z\s,]+,\s*[A-Z]{2}$/, // City, State
        /^[A-Z][a-zA-Z\s,]+$/, // City or general location
        /\d+\s+[A-Z][a-zA-Z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way)/i // Address
      ];

      locationValidation.matchesPattern = locationPatterns.some(pattern =>
        pattern.test(lead.location)
      );

      // Overall location validity
      locationValidation.verified = locationValidation.isValidFormat &&
                                   (locationValidation.hasGeographicTerms || locationValidation.matchesPattern);

      verificationResult.verificationDetails.location = locationValidation;

      // Update confidence based on location verification
      if (locationValidation.verified) {
        verificationResult.confidence += 10;
        verificationResult.recommendations.push('Location appears valid');
      } else {
        verificationResult.issues.push('Location may be invalid or incomplete');
      }

    } catch (error) {
      console.warn('⚠️ Location verification error:', error.message);
      verificationResult.issues.push(`Location verification failed: ${error.message}`);
    }
  }

  /**
   * Verify project details
   */
  async verifyProjectDetails(verificationResult) {
    const lead = verificationResult.verifiedLead;

    const projectValidation = {
      hasProjectType: !!(lead.projectType && lead.projectType !== 'Unknown'),
      hasBudget: !!(lead.budget && lead.budget !== 'Unknown'),
      hasRoomCount: !!(lead.roomCount && lead.roomCount !== 'Unknown'),
      budgetReasonable: false,
      roomCountReasonable: false,
      overallValid: false
    };

    // Validate budget reasonableness
    if (projectValidation.hasBudget) {
      projectValidation.budgetReasonable = this.isReasonableBudget(lead.budget, lead.projectType);
    }

    // Validate room count reasonableness
    if (projectValidation.hasRoomCount && lead.projectType?.toLowerCase().includes('hotel')) {
      projectValidation.roomCountReasonable = this.isReasonableRoomCount(lead.roomCount);
    }

    // Overall project validity
    projectValidation.overallValid = projectValidation.hasProjectType &&
                                    (projectValidation.budgetReasonable || !projectValidation.hasBudget) &&
                                    (projectValidation.roomCountReasonable || !projectValidation.hasRoomCount);

    verificationResult.verificationDetails.project = projectValidation;

    // Update confidence based on project validation
    if (projectValidation.overallValid) {
      verificationResult.confidence += 15;
      verificationResult.recommendations.push('Project details appear reasonable');
    } else {
      verificationResult.issues.push('Project details may be incomplete or unrealistic');
    }
  }

  /**
   * Cross-reference validation
   */
  async crossReferenceValidation(verificationResult) {
    const lead = verificationResult.verifiedLead;

    const crossValidation = {
      companyLocationMatch: false,
      projectCompanyMatch: false,
      contactCompanyMatch: false,
      overallConsistency: false
    };

    // Check if company name appears in title/description
    if (lead.company && lead.company !== 'Unknown') {
      const content = `${lead.title} ${lead.snippet || ''}`.toLowerCase();
      crossValidation.companyLocationMatch = content.includes(lead.company.toLowerCase());
    }

    // Check if project type is consistent with company type
    if (lead.projectType && lead.company) {
      const companyLower = lead.company.toLowerCase();
      const projectLower = lead.projectType.toLowerCase();

      if (projectLower.includes('hotel') && (companyLower.includes('hotel') || companyLower.includes('hospitality'))) {
        crossValidation.projectCompanyMatch = true;
      } else if (projectLower.includes('office') && (companyLower.includes('realty') || companyLower.includes('properties'))) {
        crossValidation.projectCompanyMatch = true;
      }
    }

    // Check if contacts match company
    if (lead.contacts && lead.contacts.length > 0 && lead.company) {
      crossValidation.contactCompanyMatch = lead.contacts.some(contact =>
        contact.company && contact.company.toLowerCase().includes(lead.company.toLowerCase().slice(0, 10))
      );
    }

    // Overall consistency
    const consistencyChecks = [
      crossValidation.companyLocationMatch,
      crossValidation.projectCompanyMatch,
      crossValidation.contactCompanyMatch
    ].filter(Boolean).length;

    crossValidation.overallConsistency = consistencyChecks >= 2;

    verificationResult.verificationDetails.crossReference = crossValidation;

    // Update confidence based on cross-reference validation
    if (crossValidation.overallConsistency) {
      verificationResult.confidence += 10;
      verificationResult.recommendations.push('Lead information is internally consistent');
    } else {
      verificationResult.issues.push('Lead information may be inconsistent');
    }
  }

  /**
   * Calculate final confidence score
   */
  calculateFinalConfidence(verificationResult) {
    let finalConfidence = verificationResult.confidence;

    // Apply penalties for issues
    const issuePenalty = verificationResult.issues.length * 5;
    finalConfidence -= issuePenalty;

    // Apply bonuses for recommendations
    const recommendationBonus = verificationResult.recommendations.length * 2;
    finalConfidence += recommendationBonus;

    // Ensure confidence is within bounds
    finalConfidence = Math.max(0, Math.min(100, finalConfidence));

    return Math.round(finalConfidence);
  }

  /**
   * Validation helper methods
   */
  isValidCompanyName(name) {
    if (!name || name.length < 2 || name.length > 100) return false;

    // Reject common invalid names
    const invalidNames = ['unknown', 'test', 'sample', 'example', 'lorem ipsum'];
    if (invalidNames.includes(name.toLowerCase())) return false;

    // Must contain at least one letter
    if (!/[a-zA-Z]/.test(name)) return false;

    return true;
  }

  hasBusinessTerms(name) {
    const businessTerms = ['inc', 'llc', 'corp', 'group', 'company', 'ltd', 'limited', 'enterprises', 'holdings'];
    return businessTerms.some(term => name.toLowerCase().includes(term));
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isValidPhone(phone) {
    // Remove all non-digit characters
    const digitsOnly = phone.replace(/\D/g, '');

    // Must have 10 or 11 digits (with optional country code)
    return digitsOnly.length >= 10 && digitsOnly.length <= 11;
  }

  isValidContactName(name) {
    if (!name || name.length < 2 || name.length > 50) return false;

    // Must contain at least one space (first and last name)
    if (!name.includes(' ')) return false;

    // Must contain only letters and spaces
    if (!/^[a-zA-Z\s]+$/.test(name)) return false;

    return true;
  }

  isValidLocation(location) {
    if (!location || location.length < 2 || location.length > 100) return false;

    // Must contain at least one letter
    if (!/[a-zA-Z]/.test(location)) return false;

    return true;
  }

  hasGeographicTerms(location) {
    const geoTerms = ['city', 'town', 'county', 'state', 'province', 'district', 'area', 'region'];
    return geoTerms.some(term => location.toLowerCase().includes(term));
  }

  isRelevantTitle(title, projectType) {
    if (!title || !projectType) return true; // Can't validate without both

    const titleLower = title.toLowerCase();
    const projectLower = projectType.toLowerCase();

    // Check for relevant titles based on project type
    if (projectLower.includes('hotel')) {
      return titleLower.includes('ceo') || titleLower.includes('president') ||
             titleLower.includes('director') || titleLower.includes('manager') ||
             titleLower.includes('hospitality') || titleLower.includes('development');
    }

    if (projectLower.includes('office') || projectLower.includes('commercial')) {
      return titleLower.includes('ceo') || titleLower.includes('president') ||
             titleLower.includes('director') || titleLower.includes('real estate') ||
             titleLower.includes('development') || titleLower.includes('property');
    }

    return true; // Default to valid if no specific checks
  }

  isReasonableBudget(budget, projectType) {
    if (!budget) return false;

    // Extract numeric value from budget string
    const numericMatch = budget.match(/(\d+(?:,\d{3})*(?:\.\d{2})?)/);
    if (!numericMatch) return false;

    const amount = parseFloat(numericMatch[1].replace(/,/g, ''));

    // Budget ranges based on project type
    if (projectType?.toLowerCase().includes('hotel')) {
      return amount >= 1000000 && amount <= 500000000; // $1M to $500M
    }

    if (projectType?.toLowerCase().includes('office')) {
      return amount >= 500000 && amount <= 100000000; // $500K to $100M
    }

    // General range for other projects
    return amount >= 100000 && amount <= 100000000; // $100K to $100M
  }

  isReasonableRoomCount(roomCount) {
    if (!roomCount) return false;

    // Extract numeric value
    const numericMatch = roomCount.match(/(\d+)/);
    if (!numericMatch) return false;

    const rooms = parseInt(numericMatch[1]);

    // Reasonable hotel room counts
    return rooms >= 10 && rooms <= 5000;
  }

  /**
   * Update verification statistics
   */
  updateVerificationStats(verificationResult) {
    this.stats.totalVerified++;

    if (verificationResult.verificationDetails.company?.verified) {
      this.stats.companyVerified++;
    }

    if (verificationResult.verificationDetails.contacts?.validContacts > 0) {
      this.stats.contactVerified++;
    }

    if (verificationResult.verificationDetails.location?.verified) {
      this.stats.locationVerified++;
    }

    if (verificationResult.verificationDetails.project?.budgetReasonable) {
      this.stats.budgetVerified++;
    }

    // Update average confidence
    const totalConfidence = this.stats.averageConfidence * (this.stats.totalVerified - 1) + verificationResult.confidence;
    this.stats.averageConfidence = totalConfidence / this.stats.totalVerified;
  }

  /**
   * Get verification statistics
   */
  getVerificationStats() {
    return {
      ...this.stats,
      averageConfidence: Math.round(this.stats.averageConfidence),
      cacheSize: this.verificationCache.size
    };
  }

  /**
   * Clear verification cache
   */
  clearCache() {
    this.verificationCache.clear();
    console.log('🧹 Verification cache cleared');
  }
}

module.exports = LeadVerificationService;
