"use client";
import React, { useState } from "react";

function RetirementCalculator() {
  const [birthYear, setBirthYear] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [employeeType, setEmployeeType] = useState("");
  const [result, setResult] = useState(null);
  const [errors, setErrors] = useState({
    birthYear: false,
    birthMonth: false,
    employeeType: false,
    general: "",
  });

  const monthOptions = [
    { value: 1, label: "1月" },
    { value: 2, label: "2月" },
    { value: 3, label: "3月" },
    { value: 4, label: "4月" },
    { value: 5, label: "5月" },
    { value: 6, label: "6月" },
    { value: 7, label: "7月" },
    { value: 8, label: "8月" },
    { value: 9, label: "9月" },
    { value: 10, label: "10月" },
    { value: 11, label: "11月" },
    { value: 12, label: "12月" },
  ];

  const handleYearChange = (e) => {
    const value = e.target.value;
    if (value === "" || /^\d+$/.test(value)) {
      if (value === "" || value.length <= 4) {
        setBirthYear(value);
      }
    }
  };

  const calculateRetirement = () => {
    const newErrors = {
      birthYear: false,
      birthMonth: false,
      employeeType: false,
      general: "",
    };

    let hasError = false;

    if (!birthYear) {
      newErrors.birthYear = true;
      hasError = true;
    }

    if (!birthMonth) {
      newErrors.birthMonth = true;
      hasError = true;
    }

    if (!employeeType) {
      newErrors.employeeType = true;
      hasError = true;
    }

    if (hasError) {
      newErrors.general = "请填写完整信息";
      setErrors(newErrors);
      return;
    }

    const yearNum = parseInt(birthYear);
    if (yearNum < 1960 || yearNum > 2100) {
      newErrors.birthYear = true;
      newErrors.general = "请输入1960年至2100年之间的出生年份";
      setErrors(newErrors);
      return;
    }

    setErrors(newErrors);

    const birthDateObj = new Date(parseInt(birthYear), parseInt(birthMonth) - 1, 1);
    const birthYearNum = parseInt(birthYear);
    const birthMonthNum = parseInt(birthMonth);

    let originalRetirementAge = 0;
    let targetRetirementAge = 0;
    let delayRatio = 0;

    if (employeeType === "male") {
      originalRetirementAge = 60;
      targetRetirementAge = 63;
      delayRatio = 4; // Delay 4 months for 1 month
    } else if (employeeType === "female55") {
      originalRetirementAge = 55;
      targetRetirementAge = 58;
      delayRatio = 4; // Delay 4 months for 1 month
    } else if (employeeType === "female50") {
      originalRetirementAge = 50;
      targetRetirementAge = 55;
      delayRatio = 2; // Delay 2 months for 1 month
    }

    const originalRetirementYear = birthYearNum + originalRetirementAge;
    const originalRetirementDate = new Date(originalRetirementYear, birthMonthNum - 1, 1);
    const currentDate = new Date();

    if (originalRetirementDate <= currentDate) {
      setResult({
        isRetired: true,
        message: "恭喜您已经可以退休了！",
      });
      return;
    }

    // Reform start date: 2025-01-01
    const reformStartDate = new Date(2025, 0, 1);

    // If the original retirement date is before the reform start date, it is not affected
    if (originalRetirementDate < reformStartDate) {
      setResult({
        isRetired: false,
        newRetirementAge: originalRetirementAge,
        retirementDate: `${originalRetirementYear}年${birthMonthNum}月`,
        delayMonths: 0,
      });
      return;
    }

    // Calculate the total months to delay
    const totalMonthsToDelay = (targetRetirementAge - originalRetirementAge) * 12;

    // Calculate the months from the reform start date to the original retirement date
    const monthsFromReformToOriginalRetirement =
      (originalRetirementDate.getFullYear() - reformStartDate.getFullYear()) * 12 +
      (originalRetirementDate.getMonth() - reformStartDate.getMonth());

    // Calculate the actual delay months based on the delay ratio
    let actualDelayMonths = Math.floor(monthsFromReformToOriginalRetirement / delayRatio);

    // The actual delay months cannot exceed the total delay months
    actualDelayMonths = Math.min(actualDelayMonths, totalMonthsToDelay);

    // Calculate the new retirement age
    const newRetirementAgeYears = originalRetirementAge + Math.floor(actualDelayMonths / 12);
    const newRetirementAgeMonths = actualDelayMonths % 12;

    // Calculate the new retirement date
    const newRetirementYear = originalRetirementYear + Math.floor(actualDelayMonths / 12);
    const newRetirementMonth = birthMonthNum + (actualDelayMonths % 12);
    let adjustedRetirementYear = newRetirementYear;
    let adjustedRetirementMonth = newRetirementMonth;

    // Handle the case where the month exceeds 12
    if (adjustedRetirementMonth > 12) {
      adjustedRetirementYear += 1;
      adjustedRetirementMonth -= 12;
    }

    setResult({
      isRetired: false,
      newRetirementAge: `${newRetirementAgeYears}岁${
        newRetirementAgeMonths > 0 ? newRetirementAgeMonths + "个月" : ""
      }`,
      retirementDate: `${adjustedRetirementYear}年${adjustedRetirementMonth}月`,
      delayMonths: actualDelayMonths,
    });
  };

  return (
    <div className="w-full mx-auto mt-4">
      <div className="flex flex-col lg:flex-row lg:space-x-8">
        <div className="lg:w-1/2 bg-white rounded-lg shadow-lg p-6 mb-6 lg:mb-0">
          <div className="mb-4">
            <label className="block text-lg font-medium mb-2">出生年月：</label>
            <div className="flex space-x-4">
              <div className="w-1/2 relative">
                <input
                  type="text"
                  value={birthYear}
                  onChange={handleYearChange}
                  placeholder="输入年份"
                  maxLength="4"
                  className={`w-full p-3 border ${
                    errors.birthYear ? "border-red-500 bg-red-50" : "border-gray-300"
                  } rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-lg">年</span>
                {errors.birthYear && !errors.general && <p className="text-red-500 text-sm mt-1">请输入出生年份</p>}
              </div>
              <div className="w-1/2">
                <select
                  value={birthMonth}
                  onChange={(e) => setBirthMonth(e.target.value)}
                  className={`w-full p-3 border ${
                    errors.birthMonth ? "border-red-500 bg-red-50" : "border-gray-300"
                  } rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
                >
                  <option value="">选择月份</option>
                  {monthOptions.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
                {errors.birthMonth && !errors.general && <p className="text-red-500 text-sm mt-1">请选择出生月份</p>}
              </div>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-lg font-medium mb-2">职工类型：</label>
            <div className={`space-y-2 p-3 rounded-lg ${errors.employeeType ? "border border-red-500 bg-red-50" : ""}`}>
              <div className="flex items-center">
                <input
                  type="radio"
                  id="male"
                  name="employeeType"
                  value="male"
                  checked={employeeType === "male"}
                  onChange={() => setEmployeeType("male")}
                  className="w-5 h-5 text-blue-600"
                />
                <label htmlFor="male" className="ml-2 text-lg">
                  男职工（原退休年龄60岁）
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="radio"
                  id="female55"
                  name="employeeType"
                  value="female55"
                  checked={employeeType === "female55"}
                  onChange={() => setEmployeeType("female55")}
                  className="w-5 h-5 text-blue-600"
                />
                <label htmlFor="female55" className="ml-2 text-lg">
                  女职工（原退休年龄55岁）
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="radio"
                  id="female50"
                  name="employeeType"
                  value="female50"
                  checked={employeeType === "female50"}
                  onChange={() => setEmployeeType("female50")}
                  className="w-5 h-5 text-blue-600"
                />
                <label htmlFor="female50" className="ml-2 text-lg">
                  女职工（原退休年龄50岁）
                </label>
              </div>
            </div>
            {errors.employeeType && !errors.general && <p className="text-red-500 text-sm mt-1">请选择职工类型</p>}
          </div>

          {errors.general && (
            <div className="mb-4 p-2 bg-red-50 border border-red-300 rounded-md">
              <p className="text-red-500 text-center">{errors.general}</p>
            </div>
          )}

          <button
            onClick={calculateRetirement}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg text-lg transition duration-300"
          >
            计算退休年龄
          </button>
        </div>

        <div className="lg:w-1/2 flex flex-col">
          {result && (
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6 flex-grow">
              <h2 className="text-xl font-bold text-center mb-6 text-blue-800">计算结果</h2>
              {result.isRetired ? (
                <div className="text-center text-xl text-green-600 font-bold p-8">{result.message}</div>
              ) : (
                <div className="space-y-5 text-lg">
                  <div className="flex flex-col sm:flex-row sm:items-baseline">
                    <span className="font-medium sm:w-[14rem] whitespace-nowrap">您的改革后法定退休年龄为：</span>
                    <span className="text-blue-700 font-bold text-xl">{result.newRetirementAge}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-baseline">
                    <span className="font-medium sm:w-[14rem] whitespace-nowrap">您的改革后退休时间为：</span>
                    <span className="text-blue-700 font-bold text-xl">{result.retirementDate}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-baseline">
                    <span className="font-medium sm:w-[14rem] whitespace-nowrap">您的延迟月数为：</span>
                    <span className="text-blue-700 font-bold text-xl">{result.delayMonths}个月</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="bg-white rounded-lg shadow-lg p-6 mt-auto">
            <p className="font-bold mb-2 text-gray-700">计算依据：</p>
            <p className="mb-2 text-sm text-gray-600">
              第一条　从2025年1月1日起，男职工和原法定退休年龄为五十五周岁的女职工，法定退休年龄每四个月延迟一个月，分别逐步延迟至六十三周岁和五十八周岁；原法定退休年龄为五十周岁的女职工，法定退休年龄每二个月延迟一个月，逐步延迟至五十五周岁。
            </p>
            <p className="text-sm text-gray-600">
              第二条　从2030年1月1日起，将职工按月领取基本养老金最低缴费年限由十五年逐步提高至二十年，每年提高六个月。职工达到法定退休年龄但不满最低缴费年限的，可以按照规定通过延长缴费或者一次性缴费的办法达到最低缴费年限，按月领取基本养老金。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RetirementCalculator;
