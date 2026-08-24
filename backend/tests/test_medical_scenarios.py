import os
import sys
import asyncio
import json
import logging
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from server import app, detect_emergency_warning, filter_otc_medicines, build_diagnosis_prompt, resolve_diagnosis_context, PredictInput, rule_based_fallback, normalize_prediction

print("Starting 15 Medical Scenario & Multi-Possibility Safety Tests...")

# Scenario 1: Adult with simple headache
def test_scenario_1_adult_headache():
    payload = {
        "symptoms": ["Headache"],
        "duration": "1 day",
        "age": 30,
        "gender": "male",
    }
    context = resolve_diagnosis_context(PredictInput(**payload), {})
    prompt = build_diagnosis_prompt(context)
    assert "Headache" in prompt
    assert "30 years" in prompt
    print("Scenario 1 Passed: Adult headache context resolved safely.")

# Scenario 2: Child with fever (pediatric safety)
def test_scenario_2_child_fever():
    payload = {
        "symptoms": ["Fever"],
        "age": 4,
        "weight": 16,
    }
    context = resolve_diagnosis_context(PredictInput(**payload), {})
    prompt = build_diagnosis_prompt(context)
    assert "4 years" in prompt
    assert "16" in prompt
    print("Scenario 2 Passed: Pediatric age and weight included for safe non-adult dosing.")

# Scenario 3: Elderly person with multiple medications
def test_scenario_3_elderly_polypharmacy():
    payload = {
        "symptoms": ["Dizziness", "Fatigue"],
        "age": 75,
        "current_medicines": "Amlodipine, Lisinopril, Metformin, Atorvastatin",
    }
    context = resolve_diagnosis_context(PredictInput(**payload), {})
    prompt = build_diagnosis_prompt(context)
    assert "75 years" in prompt
    assert "Amlodipine" in prompt
    print("Scenario 3 Passed: Polypharmacy context captured for elderly patient.")

# Scenario 4: Person with known drug allergy
def test_scenario_4_penicillin_allergy():
    payload = {
        "symptoms": ["Sore Throat", "Fever"],
        "allergies": "Penicillin, Amoxicillin",
        "age": 28,
    }
    context = resolve_diagnosis_context(PredictInput(**payload), {})
    prompt = build_diagnosis_prompt(context)
    assert "Penicillin" in prompt
    print("Scenario 4 Passed: Known drug allergy integrated into clinical profile.")

# Scenario 5: Person taking multiple medications
def test_scenario_5_multiple_meds_interaction():
    payload = {
        "symptoms": ["Body Pain"],
        "current_medicines": "Warfarin, Aspirin",
        "age": 55,
    }
    context = resolve_diagnosis_context(PredictInput(**payload), {})
    prompt = build_diagnosis_prompt(context)
    assert "Warfarin" in prompt
    print("Scenario 5 Passed: Multiple current meds captured for interaction screening.")

# Scenario 6: Person with kidney disease
def test_scenario_6_kidney_disease():
    payload = {
        "symptoms": ["Back Pain", "Body Pain"],
        "kidney_liver_disease": "Chronic Kidney Disease Stage 3",
        "age": 60,
    }
    context = resolve_diagnosis_context(PredictInput(**payload), {})
    prompt = build_diagnosis_prompt(context)
    assert "Chronic Kidney Disease" in prompt
    print("Scenario 6 Passed: Kidney disease organ status captured.")

# Scenario 7: Person with liver disease
def test_scenario_7_liver_disease():
    payload = {
        "symptoms": ["Fever"],
        "kidney_liver_disease": "Fatty liver disease / Elevated liver enzymes",
        "age": 45,
    }
    context = resolve_diagnosis_context(PredictInput(**payload), {})
    prompt = build_diagnosis_prompt(context)
    assert "liver" in prompt.lower()
    print("Scenario 7 Passed: Liver status captured.")

# Scenario 8: Pregnant user
def test_scenario_8_pregnant_user():
    payload = {
        "symptoms": ["Nausea", "Headache"],
        "gender": "female",
        "is_pregnant": True,
        "age": 29,
    }
    context = resolve_diagnosis_context(PredictInput(**payload), {})
    prompt = build_diagnosis_prompt(context)
    assert "Pregnancy Status: Yes" in prompt
    print("Scenario 8 Passed: Pregnancy status captured for teratogenic safety screening.")

# Scenario 9: Antibiotic prescription prohibition
def test_scenario_9_antibiotics_filter():
    raw_meds = [
        "Paracetamol 500mg",
        "Amoxicillin 500mg",
        "Azithromycin 250mg",
        "Cetirizine 10mg",
    ]
    filtered = filter_otc_medicines(raw_meds)
    assert "Amoxicillin 500mg" not in filtered
    assert "Azithromycin 250mg" not in filtered
    assert "Paracetamol 500mg" in filtered
    print("Scenario 9 Passed: Prescription antibiotics strictly filtered out from self-medication recommendations.")

# Scenario 10: Emergency red-flag symptoms
def test_scenario_10_red_flags():
    warning1 = detect_emergency_warning(["Chest Pain", "Shortness of Breath"])
    assert warning1 != ""
    assert "emergency" in warning1.lower()

    warning2 = detect_emergency_warning(["Fainting"])
    assert warning2 != ""

    warning3 = detect_emergency_warning(["Headache"], additional_notes="I have severe lip swelling and trouble swallowing")
    assert "anaphylaxis" in warning3.lower() or "allergic" in warning3.lower()
    print("Scenario 10 Passed: Emergency red flags correctly identified.")

# Scenario 11: User providing insufficient information
def test_scenario_11_insufficient_info():
    payload = {
        "symptoms": ["Headache"],
    }
    context = resolve_diagnosis_context(PredictInput(**payload), {})
    assert context.get("age") is None
    assert context.get("allergies") is None
    print("Scenario 11 Passed: Missing context detected properly.")

# Scenario 12: User asking for exact medication dose
def test_scenario_12_exact_dose():
    payload = {
        "symptoms": ["Fever"],
        "additional_notes": "What exact dosage of medicine should I take?",
        "age": 5,
    }
    context = resolve_diagnosis_context(PredictInput(**payload), {})
    prompt = build_diagnosis_prompt(context)
    assert "5 years" in prompt
    print("Scenario 12 Passed: Pediatric exact dose request context prepared safely.")

# Scenario 13: User asking whether two medications can be taken together
def test_scenario_13_drug_interaction():
    payload = {
        "symptoms": ["Body Pain"],
        "current_medicines": "Ibuprofen 400mg",
        "additional_notes": "Can I take Aspirin with my current Ibuprofen?",
    }
    context = resolve_diagnosis_context(PredictInput(**payload), {})
    prompt = build_diagnosis_prompt(context)
    assert "Ibuprofen" in prompt
    assert "Aspirin" in prompt
    print("Scenario 13 Passed: Drug combination question captured in prompt.")

# Scenario 14: Array List Payloads from Autocomplete Multi-Selects
def test_scenario_14_array_list_payloads():
    payload = {
        "symptoms": ["Headache", "Fever"],
        "existing_diseases": ["Diabetes", "Type 2 diabetes", "Hypertension"],
        "allergies": ["Penicillin", "Peanuts"],
        "current_medicines": ["Metformin", "Paracetamol"],
        "age": 45,
        "gender": "male",
    }
    input_model = PredictInput(**payload)
    context = resolve_diagnosis_context(input_model, {})
    prompt = build_diagnosis_prompt(context)
    assert "Diabetes, Type 2 diabetes, Hypertension" in prompt
    assert "Penicillin, Peanuts" in prompt
    assert "Metformin, Paracetamol" in prompt
    print("Scenario 14 Passed: Array list payloads from autocomplete multi-selects formatted into clinical prompt.")

# Scenario 15: Multi-Possibility & State C Red Flag Medication Withholding
def test_scenario_15_multi_possibilities_and_red_flag_medication():
    res = rule_based_fallback(["Chest Pain", "Shortness of Breath", "Dizziness"], "Feeling lightheaded")
    diseases = res.get("possible_diseases", [])
    med_guidance = res.get("medication_guidance", {})

    assert len(diseases) >= 3, f"Expected at least 3 possibilities, got {len(diseases)}"
    assert res.get("emergency_warning") != ""
    assert med_guidance.get("status") == "urgent_red_flag"
    assert "urgent medical evaluation" in med_guidance.get("summary", "").lower()
    print("Scenario 15 Passed: 3+ possibilities returned and self-treatment medication withheld for red-flag chest pain + shortness of breath + dizziness.")

if __name__ == "__main__":
    test_scenario_1_adult_headache()
    test_scenario_2_child_fever()
    test_scenario_3_elderly_polypharmacy()
    test_scenario_4_penicillin_allergy()
    test_scenario_5_multiple_meds_interaction()
    test_scenario_6_kidney_disease()
    test_scenario_7_liver_disease()
    test_scenario_8_pregnant_user()
    test_scenario_9_antibiotics_filter()
    test_scenario_10_red_flags()
    test_scenario_11_insufficient_info()
    test_scenario_12_exact_dose()
    test_scenario_13_drug_interaction()
    test_scenario_14_array_list_payloads()
    test_scenario_15_multi_possibilities_and_red_flag_medication()
    print("ALL 15 MEDICAL SCENARIO SAFETY, MULTI-POSSIBILITY & AUTOCOMPLETE TESTS PASSED SUCCESSFULLY!")
