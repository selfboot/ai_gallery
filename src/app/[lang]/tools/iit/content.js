"use client";

import React, { useMemo, useState } from "react";
import { useI18n } from "@/app/i18n/client";
import usePersistentState from "@/app/components/PersistentState";

const BASIC_DEDUCTION_PER_MONTH = 5000;

const TAX_BRACKETS = [
  { limit: 36000, rate: 0.03, quickDeduction: 0 },
  { limit: 144000, rate: 0.1, quickDeduction: 2520 },
  { limit: 300000, rate: 0.2, quickDeduction: 16920 },
  { limit: 420000, rate: 0.25, quickDeduction: 31920 },
  { limit: 660000, rate: 0.3, quickDeduction: 52920 },
  { limit: 960000, rate: 0.35, quickDeduction: 85920 },
  { limit: Infinity, rate: 0.45, quickDeduction: 181920 },
];

const SPECIAL_DEDUCTION_KEYS = [
  "childEducation",
  "continuingEducation",
  "housingLoanInterest",
  "housingRent",
  "elderlyCare",
  "infantCare",
  "seriousIllnessMedical",
];

const FORM_PERSIST_EXPIRATION = 365 * 24 * 60 * 60 * 1000;

const createDefaultSpecialDeductions = () =>
  SPECIAL_DEDUCTION_KEYS.reduce((acc, key) => {
    acc[key] = { enabled: false, amount: "0" };
    return acc;
  }, {});

const roundToCent = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

const parseAmount = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) {
    return 0;
  }
  return num;
};

const getTaxBracket = (taxableIncome) => {
  return TAX_BRACKETS.find((bracket) => taxableIncome <= bracket.limit) || TAX_BRACKETS[TAX_BRACKETS.length - 1];
};

const withParams = (template, params = {}) => {
  return Object.keys(params).reduce((text, key) => text.replace(new RegExp(`{{${key}}}`, "g"), params[key]), template);
};

export default function IitCalculator({ lang }) {
  const { dictionary } = useI18n();
  const iitDict = dictionary.iit || {};

  const tIit = (key, params = {}) => withParams(iitDict[key] || key, params);
  const locale = lang === "zh" ? "zh-CN" : "en-US";

  const [grossSalary, setGrossSalary, clearGrossSalary] = usePersistentState(
    "iit_gross_salary",
    "15000",
    FORM_PERSIST_EXPIRATION
  );
  const [socialInsurance, setSocialInsurance, clearSocialInsurance] = usePersistentState(
    "iit_social_insurance",
    "1500",
    FORM_PERSIST_EXPIRATION
  );
  const [housingFund, setHousingFund, clearHousingFund] = usePersistentState(
    "iit_housing_fund",
    "1000",
    FORM_PERSIST_EXPIRATION
  );
  const [hasSpecialDeduction, setHasSpecialDeduction, clearHasSpecialDeduction] = usePersistentState(
    "iit_has_special_deduction",
    "no",
    FORM_PERSIST_EXPIRATION
  );
  const [specialDeductions, setSpecialDeductions, clearSpecialDeductions] = usePersistentState(
    "iit_special_deductions",
    createDefaultSpecialDeductions(),
    FORM_PERSIST_EXPIRATION
  );

  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const specialCategories = useMemo(
    () => [
      {
        id: "childEducation",
        label: tIit("specialChildEducation"),
        hint: tIit("specialChildEducationHint"),
        monthlyReferenceCap: 2000,
        warningText: tIit("specialChildEducationWarning"),
      },
      {
        id: "continuingEducation",
        label: tIit("specialContinuingEducation"),
        hint: tIit("specialContinuingEducationHint"),
        monthlyReferenceCap: 400,
      },
      {
        id: "housingLoanInterest",
        label: tIit("specialHousingLoanInterest"),
        hint: tIit("specialHousingLoanInterestHint"),
        monthlyReferenceCap: 1000,
        warningText: tIit("specialHousingLoanInterestWarning"),
      },
      {
        id: "housingRent",
        label: tIit("specialHousingRent"),
        hint: tIit("specialHousingRentHint"),
        monthlyReferenceCap: 1500,
        warningText: tIit("specialHousingRentWarning"),
      },
      {
        id: "elderlyCare",
        label: tIit("specialElderlyCare"),
        hint: tIit("specialElderlyCareHint"),
        monthlyReferenceCap: 3000,
        warningText: tIit("specialElderlyCareWarning"),
      },
      {
        id: "infantCare",
        label: tIit("specialInfantCare"),
        hint: tIit("specialInfantCareHint"),
        monthlyReferenceCap: 2000,
        warningText: tIit("specialInfantCareWarning"),
      },
      {
        id: "seriousIllnessMedical",
        label: tIit("specialSeriousIllnessMedical"),
        hint: tIit("specialSeriousIllnessMedicalHint"),
        monthlyReferenceCap: 6666.67,
        warningText: tIit("specialSeriousIllnessMedicalWarning"),
      },
    ],
    [iitDict]
  );

  const formatCurrency = (value) => {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const onSpecialAmountChange = (key, value, maxAmount) => {
    if (value === "") {
      setSpecialDeductions((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          amount: "",
        },
      }));
      return;
    }

    if (!/^\d*\.?\d{0,2}$/.test(value)) {
      return;
    }

    let nextAmount = value;
    const numValue = Number(value);
    if (Number.isFinite(numValue) && Number.isFinite(maxAmount) && numValue > maxAmount) {
      nextAmount = String(roundToCent(maxAmount));
    }

    setSpecialDeductions((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        amount: nextAmount,
      },
    }));
  };

  const normalizeSpecialAmountOnBlur = (key) => {
    setSpecialDeductions((prev) => {
      if (prev[key]?.amount !== "") {
        return prev;
      }
      return {
        ...prev,
        [key]: {
          ...prev[key],
          amount: "0",
        },
      };
    });
  };

  const calculateTax = () => {
    const gross = parseAmount(grossSalary);
    const monthlySocialInsurance = parseAmount(socialInsurance);
    const monthlyHousingFund = parseAmount(housingFund);
    const monthlyInsuranceHousingFund = roundToCent(monthlySocialInsurance + monthlyHousingFund);

    if (gross <= 0) {
      setError(tIit("errorGrossSalary"));
      setResult(null);
      return;
    }

    setError("");

    const monthlySpecialDeduction =
      hasSpecialDeduction === "yes"
        ? specialCategories.reduce((sum, item) => {
            const currentItem = specialDeductions[item.id];
            if (!currentItem?.enabled) {
              return sum;
            }
            return sum + parseAmount(currentItem.amount);
          }, 0)
        : 0;

    const monthlyDetails = [];
    let previousCumulativeTax = 0;

    for (let month = 1; month <= 12; month++) {
      const cumulativeGrossIncome = roundToCent(gross * month);
      const cumulativeInsuranceFund = roundToCent(monthlyInsuranceHousingFund * month);
      const cumulativeSpecialDeduction = roundToCent(monthlySpecialDeduction * month);
      const cumulativeBasicDeduction = BASIC_DEDUCTION_PER_MONTH * month;

      const cumulativeTaxableIncome = Math.max(
        0,
        roundToCent(
          cumulativeGrossIncome - cumulativeInsuranceFund - cumulativeSpecialDeduction - cumulativeBasicDeduction
        )
      );

      const bracket = getTaxBracket(cumulativeTaxableIncome);
      const cumulativeTax = Math.max(
        0,
        roundToCent(cumulativeTaxableIncome * bracket.rate - bracket.quickDeduction)
      );

      const monthlyTax = Math.max(0, roundToCent(cumulativeTax - previousCumulativeTax));
      const monthlyTakeHomeIncome = roundToCent(gross - monthlyInsuranceHousingFund - monthlyTax);

      monthlyDetails.push({
        month,
        monthlyTax,
        cumulativeTax,
        cumulativeTaxableIncome,
        rate: bracket.rate,
        quickDeduction: bracket.quickDeduction,
        monthlyTakeHomeIncome,
      });

      previousCumulativeTax = cumulativeTax;
    }

    const annualGrossIncome = roundToCent(gross * 12);
    const annualSocialInsurance = roundToCent(monthlySocialInsurance * 12);
    const annualHousingFund = roundToCent(monthlyHousingFund * 12);
    const annualInsuranceFund = roundToCent(monthlyInsuranceHousingFund * 12);
    const annualSpecialDeduction = roundToCent(monthlySpecialDeduction * 12);
    const annualTax = monthlyDetails[monthlyDetails.length - 1].cumulativeTax;
    const annualTaxableIncome = monthlyDetails[monthlyDetails.length - 1].cumulativeTaxableIncome;
    const annualTakeHomeIncome = roundToCent(annualGrossIncome - annualInsuranceFund - annualTax);

    setResult({
      monthlySpecialDeduction,
      annualGrossIncome,
      annualSocialInsurance,
      annualHousingFund,
      annualInsuranceFund,
      annualSpecialDeduction,
      annualTaxableIncome,
      annualTax,
      annualTakeHomeIncome,
      averageMonthlyTax: roundToCent(annualTax / 12),
      monthlyDetails,
    });
  };

  const resetAll = () => {
    clearGrossSalary();
    clearSocialInsurance();
    clearHousingFund();
    clearHasSpecialDeduction();
    clearSpecialDeductions();
    setResult(null);
    setError("");
  };

  return (
    <div className="w-full mx-auto mt-4 space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6">{tIit("toolTitle")}</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{tIit("grossSalary")}</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={grossSalary}
              onChange={(e) => setGrossSalary(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{tIit("socialInsurance")}</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={socialInsurance}
              onChange={(e) => setSocialInsurance(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{tIit("housingFund")}</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={housingFund}
              onChange={(e) => setHousingFund(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mt-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">{tIit("hasSpecialDeduction")}</label>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="hasSpecialDeduction"
                value="yes"
                checked={hasSpecialDeduction === "yes"}
                onChange={() => setHasSpecialDeduction("yes")}
              />
              <span>{tIit("yes")}</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="hasSpecialDeduction"
                value="no"
                checked={hasSpecialDeduction === "no"}
                onChange={() => setHasSpecialDeduction("no")}
              />
              <span>{tIit("no")}</span>
            </label>
          </div>
        </div>

        {hasSpecialDeduction === "yes" && (
          <div className="mt-5 border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">{tIit("specialDeductionSettings")}</h3>
            <ul className="list-disc list-inside text-xs text-gray-600 mb-4 space-y-1">
              <li>{tIit("specialDeductionTips1")}</li>
            </ul>
            <div className="space-y-3">
              {specialCategories.map((item) => {
                return (
                  <div key={item.id} className="grid grid-cols-1 md:grid-cols-[1fr_160px] gap-3 items-start">
                    <div>
                      <label className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={specialDeductions[item.id]?.enabled || false}
                          onChange={() =>
                            setSpecialDeductions((prev) => ({
                              ...prev,
                              [item.id]: {
                                ...prev[item.id],
                                enabled: !prev[item.id]?.enabled,
                                amount: prev[item.id]?.enabled
                                  ? prev[item.id]?.amount
                                  : Number.isFinite(item.monthlyReferenceCap)
                                    ? String(roundToCent(item.monthlyReferenceCap))
                                    : "0",
                              },
                            }))
                          }
                        />
                        <span className="leading-5">
                          {item.label}
                          <span className="hidden md:inline text-xs text-gray-500 ml-2">{item.hint}</span>
                        </span>
                      </label>
                      <p className="md:hidden text-xs text-gray-500 mt-1 pl-6">{item.hint}</p>
                    </div>
                    <input
                      type="number"
                      min="0"
                      max={item.monthlyReferenceCap}
                      step="0.01"
                      placeholder={tIit("deductionAmountPlaceholder")}
                      disabled={!specialDeductions[item.id]?.enabled}
                      value={specialDeductions[item.id]?.amount ?? "0"}
                      onChange={(e) => onSpecialAmountChange(item.id, e.target.value, item.monthlyReferenceCap)}
                      onBlur={() => normalizeSpecialAmountOnBlur(item.id)}
                      className="w-full border border-gray-300 rounded-lg p-2 disabled:bg-gray-100 disabled:text-gray-400"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {error && <p className="mt-4 text-red-600">{error}</p>}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={calculateTax}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {tIit("calculate")}
          </button>
          <button
            onClick={resetAll}
            className="px-5 py-2.5 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors"
          >
            {tIit("reset")}
          </button>
        </div>
      </div>

      {result && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold mb-2">{tIit("summaryTitle")}</h3>
            <p className="text-sm text-gray-500 mb-4">{tIit("resultHint")}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="border rounded-lg p-4">
                <p className="text-sm text-gray-500">{tIit("annualGrossIncome")}</p>
                <p className="text-xl font-semibold">{formatCurrency(result.annualGrossIncome)}</p>
              </div>
              <div className="border rounded-lg p-4">
                <p className="text-sm text-gray-500">{tIit("annualSocialInsurance")}</p>
                <p className="text-xl font-semibold">{formatCurrency(result.annualSocialInsurance)}</p>
              </div>
              <div className="border rounded-lg p-4">
                <p className="text-sm text-gray-500">{tIit("annualHousingFund")}</p>
                <p className="text-xl font-semibold">{formatCurrency(result.annualHousingFund)}</p>
              </div>
              <div className="border rounded-lg p-4">
                <p className="text-sm text-gray-500">{tIit("annualInsuranceHousingFund")}</p>
                <p className="text-xl font-semibold">{formatCurrency(result.annualInsuranceFund)}</p>
              </div>
              <div className="border rounded-lg p-4">
                <p className="text-sm text-gray-500">{tIit("annualSpecialDeduction")}</p>
                <p className="text-xl font-semibold">{formatCurrency(result.annualSpecialDeduction)}</p>
              </div>
              <div className="border rounded-lg p-4">
                <p className="text-sm text-gray-500">{tIit("annualTaxableIncome")}</p>
                <p className="text-xl font-semibold">{formatCurrency(result.annualTaxableIncome)}</p>
              </div>
              <div className="border rounded-lg p-4 bg-red-50 border-red-200">
                <p className="text-sm text-red-600">{tIit("annualTax")}</p>
                <p className="text-xl font-semibold text-red-700">{formatCurrency(result.annualTax)}</p>
              </div>
              <div className="border rounded-lg p-4 bg-green-50 border-green-200">
                <p className="text-sm text-green-600">{tIit("annualTakeHome")}</p>
                <p className="text-xl font-semibold text-green-700">{formatCurrency(result.annualTakeHomeIncome)}</p>
              </div>
            </div>

            <p className="mt-4 text-sm text-gray-700">
              {tIit("averageMonthlyTax")}: <span className="font-semibold">{formatCurrency(result.averageMonthlyTax)}</span>
              {" | "}
              {tIit("monthlySpecialDeduction")}: <span className="font-semibold">{formatCurrency(result.monthlySpecialDeduction)}</span>
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold mb-4">{tIit("monthlyTableTitle")}</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 border">{tIit("month")}</th>
                    <th className="px-3 py-2 border">{tIit("monthlyTax")}</th>
                    <th className="px-3 py-2 border">{tIit("cumulativeTax")}</th>
                    <th className="px-3 py-2 border">{tIit("cumulativeTaxableIncome")}</th>
                    <th className="px-3 py-2 border">{tIit("taxRate")}</th>
                    <th className="px-3 py-2 border">{tIit("quickDeduction")}</th>
                    <th className="px-3 py-2 border">{tIit("monthlyTakeHome")}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.monthlyDetails.map((row) => (
                    <tr key={row.month} className="odd:bg-white even:bg-gray-50">
                      <td className="px-3 py-2 border text-center">{row.month}</td>
                      <td className="px-3 py-2 border text-right">{formatCurrency(row.monthlyTax)}</td>
                      <td className="px-3 py-2 border text-right">{formatCurrency(row.cumulativeTax)}</td>
                      <td className="px-3 py-2 border text-right">{formatCurrency(row.cumulativeTaxableIncome)}</td>
                      <td className="px-3 py-2 border text-center">{(row.rate * 100).toFixed(0)}%</td>
                      <td className="px-3 py-2 border text-right">{formatCurrency(row.quickDeduction)}</td>
                      <td className="px-3 py-2 border text-right">{formatCurrency(row.monthlyTakeHomeIncome)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-bold mb-2">{tIit("assumptionTitle")}</h3>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
              <li>{tIit("assumption1")}</li>
              <li>{tIit("assumption2")}</li>
              <li>{tIit("assumption3")}</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
