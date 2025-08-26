class DataExtractionService {
  constructor() {
    // Common patterns for different types of data
    this.patterns = {
      company: [
        /(?:by|from|announced by|developed by|launched by|constructed by)\s+([A-Z][a-zA-Z\s&.,]+?)(?:\s|$|,|\.)/i,
        /([A-Z][a-zA-Z\s&.,]+?)\s+(?:announced|launched|developed|constructed|expanded|opened)/i,
        /(?:company|organization|firm|inc|llc|corp|corporation)\s*[:\-]?\s*([A-Z][A-Za-z\s&.,]+)/i
      ],
      
      location: [
        /(?:in|at|near|within|located in)\s+([A-Z][a-zA-Z\s,]+?)(?:\s|$|,|\.)/i,
        /([A-Z][a-zA-Z\s,]+?)\s+(?:area|district|region|city|county|state|neighborhood)/i,
        /(?:downtown|uptown|midtown|historic district|business district)\s+([A-Z][a-zA-Z\s,]+)/i
      ],
      
      projectType: [
        'hotel', 'resort', 'apartment', 'condominium', 'condo', 'office', 'retail', 'industrial',
        'warehouse', 'restaurant', 'entertainment', 'healthcare', 'education', 'residential',
        'mixed-use', 'commercial', 'residential', 'hospitality', 'tourism', 'infrastructure'
      ],
      
      budget: [
        /(?:budget|cost|investment|price|amount|value)\s*(?:of|:)?\s*[\$]?(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:k|K|m|M|b|B|thousand|million|billion)?/i,
        /[\$](\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:k|K|m|M|b|B|thousand|million|billion)/i,
        /(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:k|K|m|M|b|B|thousand|million|billion)\s*(?:dollars?|USD)/i
      ],
      
      timeline: [
        /(?:completes?|finishes?|opens?|launches?|delivers?)\s+(?:in|by|during|by the end of)\s+(\d{4})/i,
        /(?:expected|scheduled|planned|target)\s+(?:completion|opening|launch|delivery)\s+(?:in|by|during)\s+(\d{4})/i,
        /(\d{4})\s+(?:completion|opening|launch|deadline|target date)/i,
        /(?:Q[1-4]|quarter)\s+(\d{4})/i
      ],
      
      roomCount: [
        /(\d+)\s*(?:rooms?|suites?|units?|apartments?|guest rooms?)/i,
        /(?:rooms?|suites?|units?|apartments?|guest rooms?)\s*:?\s*(\d+)/i,
        /(?:capacity|accommodates?)\s*(?:up to\s*)?(\d+)\s*(?:guests?|visitors?)/i
      ],
      
      squareFootage: [
        /(\d+(?:,\d{3})*)\s*(?:sq\s*ft|square\s*feet|square\s*foot|ft²)/i,
        /(?:sq\s*ft|square\s*feet|square\s*foot|ft²)\s*:?\s*(\d+(?:,\d{3})*)/i,
        /(\d+(?:,\d{3})*)\s*(?:square\s*)?meters?/i
      ],
      
      employees: [
        /(\d+(?:,\d{3})*)\s*(?:employees?|staff|workers?|jobs?)/i,
        /(?:employees?|staff|workers?|jobs?)\s*:?\s*(\d+(?:,\d{3})*)/i,
        /(?:creates?|generates?)\s*(\d+(?:,\d{3})*)\s*(?:new\s*)?(?:jobs?|positions?)/i
      ]
    };
  }

  extractCompanyFromText(text) {
    if (!text) return "Unknown";
    
    // Enhanced company extraction patterns
    const enhancedPatterns = [
      // Company announces/develops pattern
      /([A-Z][a-zA-Z\s&.,]+?)\s+(?:announces|launches|develops|constructs|expands|opens|plans|proposes)/i,
      // Announced by company pattern
      /(?:announced by|developed by|constructed by|launched by)\s+([A-Z][a-zA-Z\s&.,]+?)(?:\s|$|,|\.)/i,
      // Company name followed by project type
      /([A-Z][a-zA-Z\s&.,]+?)\s+(?:hotel|resort|apartment|office|building|complex|development|project)/i,
      // Company name in quotes or parentheses
      /["']([A-Z][a-zA-Z\s&.,]+?)["']/,
      /\(([A-Z][a-zA-Z\s&.,]+?)\)/,
      // Original patterns
      ...this.patterns.company
    ];
    
    for (const pattern of enhancedPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const company = match[1].trim();
        // Clean up common artifacts and validate
        const cleaned = company.replace(/^(the\s+|a\s+)/i, '').replace(/[.,]$/, '');
        if (cleaned.length > 2 && cleaned.length < 50) {
          return cleaned;
        }
      }
    }
    
    // Try to extract from title if it looks like a company name
    const words = text.split(/\s+/);
    for (let i = 0; i < Math.min(3, words.length); i++) {
      const word = words[i];
      if (word.match(/^[A-Z][a-z]+$/) && word.length > 3) {
        return word;
      }
    }
    
    return "Unknown";
  }

  extractLocationFromText(text) {
    if (!text) return "Unknown";
    
    // Enhanced location extraction patterns
    const enhancedPatterns = [
      // Location followed by project type
      /([A-Z][a-zA-Z\s,]+?)\s+(?:hotel|resort|apartment|office|building|complex|development|project)/i,
      // Project type in location
      /(?:hotel|resort|apartment|office|building|complex|development|project)\s+(?:in|at|near)\s+([A-Z][a-zA-Z\s,]+?)(?:\s|$|,|\.)/i,
      // Common city/state patterns
      /([A-Z][a-zA-Z\s]+?),\s*([A-Z]{2})/i, // City, State
      /([A-Z][a-zA-Z\s]+?)\s+(?:County|City|District|Area|Region)/i,
      // Original patterns
      ...this.patterns.location
    ];
    
    for (const pattern of enhancedPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const location = match[1].trim();
        // Clean up common artifacts and validate
        const cleaned = location.replace(/[.,]$/, '');
        if (cleaned.length > 2 && cleaned.length < 50) {
          return cleaned;
        }
      }
    }
    
    // Try to extract from title if it looks like a location
    const words = text.split(/\s+/);
    for (let i = 0; i < Math.min(5, words.length); i++) {
      const word = words[i];
      if (word.match(/^[A-Z][a-z]+$/) && word.length > 3) {
        // Check if it's not already identified as a company
        if (!text.toLowerCase().includes(word.toLowerCase() + ' announces') &&
            !text.toLowerCase().includes(word.toLowerCase() + ' develops')) {
          return word;
        }
      }
    }
    
    return "Unknown";
  }

  extractProjectTypeFromText(text) {
    if (!text) return "Unknown";
    
    const lowerText = text.toLowerCase();
    
    // Look for specific project types
    for (const type of this.patterns.projectType) {
      if (lowerText.includes(type)) {
        return type.charAt(0).toUpperCase() + type.slice(1);
      }
    }
    
    // Look for compound project types
    const compoundTypes = [
      'mixed-use development',
      'residential complex',
      'commercial center',
      'business district',
      'entertainment district'
    ];
    
    for (const type of compoundTypes) {
      if (lowerText.includes(type)) {
        return type.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      }
    }
    
    return "Unknown";
  }

  extractBudgetFromText(text) {
    if (!text) return "Unknown";
    
    // Enhanced budget extraction patterns
    const enhancedPatterns = [
      // Dollar amounts with various formats
      /[\$]?(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:k|K|m|M|b|B|thousand|million|billion|k|m|b)/i,
      // Budget/cost/investment followed by amount
      /(?:budget|cost|investment|price|amount|value|funding)\s*(?:of|:)?\s*[\$]?(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      // Amount followed by currency or unit
      /(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:k|K|m|M|b|B|thousand|million|billion|dollars?|USD)/i,
      // Original patterns
      ...this.patterns.budget
    ];
    
    for (const pattern of enhancedPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const amount = parseFloat(match[1].replace(/,/g, ''));
        if (isNaN(amount)) continue;
        
        // Determine multiplier based on text context
        const lowerText = text.toLowerCase();
        let multiplier = 1;
        
        if (lowerText.includes('k') || lowerText.includes('thousand')) {
          multiplier = 1000;
        } else if (lowerText.includes('m') || lowerText.includes('million')) {
          multiplier = 1000000;
        } else if (lowerText.includes('b') || lowerText.includes('billion')) {
          multiplier = 1000000000;
        }
        
        const finalAmount = amount * multiplier;
        if (finalAmount > 0) {
          return finalAmount.toString();
        }
      }
    }
    
    return "Unknown";
  }

  extractTimelineFromText(text) {
    if (!text) return "Unknown";
    
    for (const pattern of this.patterns.timeline) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const year = parseInt(match[1]);
        const currentYear = new Date().getFullYear();
        
        // Validate year is reasonable (current year to 10 years in future)
        if (year >= currentYear && year <= currentYear + 10) {
          return year.toString();
        }
      }
    }
    
    return "Unknown";
  }

  extractRoomCountFromText(text) {
    if (!text) return "Unknown";
    
    for (const pattern of this.patterns.roomCount) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const count = parseInt(match[1]);
        if (count > 0 && count < 10000) {
          return count.toString();
        }
      }
    }
    
    return "Unknown";
  }

  extractSquareFootageFromText(text) {
    if (!text) return "Unknown";
    
    for (const pattern of this.patterns.squareFootage) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].replace(/,/g, '');
      }
    }
    
    return "Unknown";
  }

  extractEmployeesFromText(text) {
    if (!text) return "Unknown";
    
    for (const pattern of this.patterns.employees) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].replace(/,/g, '');
      }
    }
    
    return "Unknown";
  }

  extractContactInfoFromText(text) {
    if (!text) return { email: "Unknown", phone: "Unknown" };
    
    // Extract email
    const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
    const email = emailMatch ? emailMatch[0] : "Unknown";
    
    // Extract phone numbers (various formats)
    const phonePatterns = [
      /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,
      /(\d{3})[-.\s]?(\d{3})[-.\s]?(\d{4})/,
      /(\d{3})[-.\s]?(\d{4})[-.\s]?(\d{4})/
    ];
    
    let phone = "Unknown";
    for (const pattern of phonePatterns) {
      const phoneMatch = text.match(pattern);
      if (phoneMatch) {
        phone = phoneMatch[0];
        break;
      }
    }
    
    return { email, phone };
  }

  extractDescriptionFromText(text) {
    if (!text) return "Unknown";
    
    // Find the most relevant sentence that describes the project
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    
    const relevantKeywords = [
      'announced', 'launched', 'developed', 'constructed', 'project',
      'development', 'construction', 'expansion', 'renovation', 'opening'
    ];
    
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      if (relevantKeywords.some(keyword => lowerSentence.includes(keyword))) {
        return sentence.trim();
      }
    }
    
    // Fallback to first meaningful sentence
    return sentences[0] ? sentences[0].trim() : text.substring(0, 200).trim();
  }

  calculateBudgetRange(budget) {
    if (!budget || budget === 'Unknown') return 'not_specified';
    
    const amount = parseFloat(budget);
    if (isNaN(amount)) return 'not_specified';
    
    if (amount < 10000) return 'under_10k';
    if (amount < 50000) return '10k_50k';
    if (amount < 100000) return '50k_100k';
    if (amount < 500000) return '100k_500k';
    if (amount < 1000000) return '500k_1m';
    if (amount < 5000000) return '1m_5m';
    if (amount < 10000000) return '5m_10m';
    return 'over_10m';
  }

  extractAllData(text) {
    return {
      company: this.extractCompanyFromText(text),
      location: this.extractLocationFromText(text),
      projectType: this.extractProjectTypeFromText(text),
      budget: this.extractBudgetFromText(text),
      budgetRange: this.calculateBudgetRange(this.extractBudgetFromText(text)),
      timeline: this.extractTimelineFromText(text),
      roomCount: this.extractRoomCountFromText(text),
      squareFootage: this.extractSquareFootageFromText(text),
      employees: this.extractEmployeesFromText(text),
      contactInfo: this.extractContactInfoFromText(text),
      description: this.extractDescriptionFromText(text)
    };
  }

  // Advanced extraction using context clues
  extractContextualData(text) {
    const data = this.extractAllData(text);
    
    // Enhance with context clues
    const lowerText = text.toLowerCase();
    
    // Project status
    if (lowerText.includes('announced') || lowerText.includes('proposed')) {
      data.status = 'proposed';
    } else if (lowerText.includes('under construction') || lowerText.includes('construction began')) {
      data.status = 'under_construction';
    } else if (lowerText.includes('completed') || lowerText.includes('opened')) {
      data.status = 'completed';
    } else {
      data.status = 'unknown';
    }
    
    // Project priority
    if (lowerText.includes('urgent') || lowerText.includes('immediate') || lowerText.includes('asap')) {
      data.priority = 'high';
    } else if (lowerText.includes('soon') || lowerText.includes('quickly')) {
      data.priority = 'medium';
    } else {
      data.priority = 'low';
    }
    
    // Industry type
    if (lowerText.includes('hotel') || lowerText.includes('resort') || lowerText.includes('hospitality')) {
      data.industryType = 'hospitality';
    } else if (lowerText.includes('apartment') || lowerText.includes('residential') || lowerText.includes('housing')) {
      data.industryType = 'residential';
    } else if (lowerText.includes('office') || lowerText.includes('commercial') || lowerText.includes('business')) {
      data.industryType = 'commercial';
    } else if (lowerText.includes('retail') || lowerText.includes('shopping') || lowerText.includes('store')) {
      data.industryType = 'retail';
    } else {
      data.industryType = 'mixed_use';
    }
    
    return data;
  }
}

module.exports = DataExtractionService;
